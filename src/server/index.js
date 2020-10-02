const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const port = 3000;

function shuffle(players) {
	for (let i = players.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[players[i], players[j]] = [players[j], players[i]];
	}
	return players;
}

const DummyState = {
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

function createNewRoom(roomcode, hostPlayer) {
	DummyState[roomcode] = { status: "waiting", players: {} };
}
const avatarList = ["duck", "tRex", "chick", "frontChick", "babyChick"];
function joinRoom(roomcode, playerName) {
	if (DummyState[roomcode].players[playerName]) {
		return;
	}

	DummyState[roomcode].players[playerName] = {
		kills: 0,
		living: true,
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
	console.log(shuffledPlayerList);
	shuffledPlayerList.forEach((hunter, index) => {
		if (shuffledPlayerList.length === index + 1) {
			players[hunter].target = shuffledPlayerList[0];
			return;
		}
		players[hunter].target = shuffledPlayerList[index + 1];
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
	const target = DummyState[roomcode].players[playerName].target;
	const targetOfTarget = DummyState[roomcode].players[target].target;

	DummyState[roomcode].players[target].living = false;
	DummyState[roomcode].players[target].killedBy = playerName;
	console.log(
		`${playerName} tries to kill ${target}`,
		DummyState[roomcode].players[target].living
	);
	DummyState[roomcode].players[playerName].kills++;
	DummyState[roomcode].players[playerName].target = targetOfTarget;

	res.send(JSON.stringify(DummyState[roomcode].players[playerName]));
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});

function validateRequest(req, res) {
	const roomcode = req.body.roomcode;
	const playerName = req.body.name;

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
