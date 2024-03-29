const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const port = 3000;

function shuffle(players) {
	for (let i = players.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[players[i], players[j]] = [players[j], players[i]];
	}
	return players;
}

let DummyState = {
	haunted: {
		players: {
			player01: {
				kills: 0,
				living: true,
				target: "player02",
			},
			player02: {
				kills: 0,
				living: true,
				target: "player01",
			},
		},
	},
};
if (!fs.existsSync("currentState.json")) {
	fs.writeFileSync("currentState.json", "{}");
}
DummyState = JSON.parse(fs.readFileSync("currentState.json"));

function createNewRoom(roomcode, hostPlayer) {
	DummyState[roomcode] = { status: "waiting", players: {} };
}

const baseAction = "Give something to $target.";
const specialActions = [
	"Get $target to give you something.",
	"Get $target to pick something up for you.",
];

const avatarList = [
	"duck",
	"tRex",
	"chick",
	"frontChick",
	"babyChick",
	"llama",
	"otter",
	"monkey",
	"penguin",
	"chicken",
	"sloth",
	"shark",
];
function joinRoom(roomcode, playerName) {
	if (DummyState[roomcode].players[playerName]) {
		return;
	}

	DummyState[roomcode].players[playerName] = {
		kills: 0,
		living: true,
		killCode: Math.floor(Math.random() * 900) + 100,
		avatar: avatarList[Math.floor(Math.random() * avatarList.length)],
	};
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("src/interface"));

app.post("/createRoom", (req, res) => {
	const roomcode = req.body.roomcode;
	const playerName = req.body.name;

	if (!DummyState[roomcode]) {
		createNewRoom(roomcode, playerName);
	}

	if (
		DummyState[roomcode].status === "started" &&
		!DummyState[roomcode].players[playerName]
	) {
		console.log(
			"room already started and player not known",
			playerName,
			DummyState[roomcode].players[playerName]
		);
		return;
	}
	joinRoom(roomcode, playerName);
	res.send(
		JSON.stringify({
			...DummyState[roomcode].players[playerName],
			players: DummyState[roomcode].players,
			status: DummyState[roomcode].status,
		})
	);
});
app.post("/startGame", (req, res) => {
	if (validateRequest(req, res) === "error") {
		return;
	}

	const roomcode = req.body.roomcode;
	const playerName = req.body.name;
	const players = DummyState[roomcode].players;

	if (DummyState[roomcode].status !== "waiting") {
		res.send(JSON.stringify(DummyState[roomcode].players[playerName]));
		return;
	}

	DummyState[roomcode].status = "started";
	const shuffledPlayerList = shuffle(Object.keys(players));
	console.log({ shuffledPlayerList });
	shuffledPlayerList.forEach((hunter, index) => {
		const shouldGetASpecialAction = Math.random() > 0.9;
		players[hunter].action = shouldGetASpecialAction
			? specialActions[Math.floor(Math.random() * specialActions.length)]
			: baseAction;
		if (shuffledPlayerList.length === index + 1) {
			players[hunter].target = shuffledPlayerList[0];
			players[hunter].action = players[hunter].action.replace(
				"$target",
				players[hunter].target
			);
			return;
		}
		players[hunter].target = shuffledPlayerList[index + 1];
		players[hunter].action = players[hunter].action.replace(
			"$target",
			players[hunter].target
		);
	});

	JSON.stringify({
		...DummyState[roomcode].players[playerName],
		players: DummyState[roomcode].players,
		status: DummyState[roomcode].status,
	});
});

app.post("/getGameState", (req, res) => {
	if (validateRequest(req, res) === "error") {
		return;
	}

	const roomcode = req.body.roomcode;
	const playerName = req.body.name;
	const roomState = DummyState[roomcode];

	if (!roomState) {
		return;
	}

	res.send(
		JSON.stringify({
			...roomState.players[playerName],
			players: roomState.players,
			status: roomState.status,
		})
	);
});

app.post("/targetKilled", (req, res) => {
	if (validateRequest(req, res) === "error") {
		return;
	}

	const roomcode = req.body.roomcode;
	const playerName = req.body.name;
	const targetKillCode = req.body.targetKillCode;
	const killer = DummyState[roomcode].players[playerName];
	const victim = DummyState[roomcode].players[killer.target];

	console.log(`${playerName} tries to kill ${killer.target}`);

	if (victim.killCode != targetKillCode) {
		res.status(403).send();
		return;
	}

	victim.living = false;
	victim.killedBy = playerName;
	killer.kills++;
	killer.target = victim.target;
	killer.action =
		specialActions[Math.floor(Math.random() * specialActions.length)];
	killer.action = killer.action.replace("$target", killer.target);

	res.send(JSON.stringify(DummyState[roomcode].players[playerName]));
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});

function validateRequest(req, res) {
	const roomcode = req.body.roomcode;
	const playerName = req.body.name;
	fs.writeFileSync("currentState.json", JSON.stringify(DummyState));

	if (!DummyState[roomcode]) {
		console.log(`Room with code "${roomcode}" not found!`);
		res.status(400).send("Bad Request");
		return "error";
	}

	if (!DummyState[roomcode].players[playerName]) {
		console.log(
			`Player with name "${playerName}" not found in game "${roomcode}"!`
		);
		res.status(400).send("Bad Request");
		return "error";
	}
	return "ok";
}
