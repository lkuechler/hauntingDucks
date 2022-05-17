console.log("Hello ducks");

const form = document.querySelector("#form");
const inputRoomcode = document.querySelector("#inputRoomcode");
const inputName = document.querySelector("#inputName");

const startGameButton = document.querySelector("#startGame");

const actionNode = document.querySelector("#action");
const killNode = document.querySelector("#kill");
const killsNodes = document.querySelectorAll(".kills");
const killCodeNode = document.querySelector("#killCode");
const leaveRoomNodes = document.querySelectorAll(".leaveRoom");

let state = {};

function init() {
	const roomcode = localStorage.getItem("roomcode");
	if (roomcode) {
		inputRoomcode.value = roomcode;
	}

	const name = localStorage.getItem("name");
	if (name) {
		inputName.value = name;
	}
}

function updateRoomCode() {
	state.roomcode = inputRoomcode.value;
	localStorage.setItem("roomcode", inputRoomcode.value);
}
function updateName() {
	state.name = inputName.value;
	localStorage.setItem("name", inputName.value);
}

form.addEventListener("submit", (event) => {
	console.log("submit");
	event.preventDefault();
	formSubmit();
});

startGameButton.addEventListener("click", (event) => {
	console.log("startGame");
	event.preventDefault();
	startGame();
});

killNode.addEventListener("click", (event) => {
	event.preventDefault();

	const targetKillCode = window.prompt(
		`Are you sure that want to kill ${state.target}?`
	);
	if (targetKillCode) {
		killTarget(targetKillCode);
	}
});

leaveRoomNodes.forEach((leaveRoomNode) => {
	leaveRoomNode.addEventListener("click", (event) => {
		console.log("leaveRoom");
		event.preventDefault();
		location.reload();
	});
});

function formSubmit() {
	updateRoomCode();
	updateName();
	console.log(`/createRoom`, JSON.stringify(state));
	fetch(`/createRoom`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(state),
	})
		.then((response) => response.json())
		.then((data) => {
			console.log(data);
			state.kills = data.kills;
			killsNodes.forEach((node) => (node.innerHTML = state.kills));
			killCodeNode.innerHTML = state.killCode;
			state.status = data.status;
			state.players = data.players;
			state.target = data.target;
			state.action = data.action;
			actionNode.innerHTML = state.action;
			state.living = data.living;
			renderInterface();
			tick();
		});
}

const avatarNode = document.querySelector("#avatar");
function startGame() {
	fetch(`/startGame`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(state),
	})
		.then((response) => response.json())
		.then((data) => {
			console.log(data);
			state.kills = data.kills;
			state.killCode = data.killCode;
			killsNodes.forEach((node) => (node.innerHTML = state.kills));
			killCodeNode.innerHTML = state.killCode;
			state.status = data.status;
			state.players = data.players;
			state.target = data.target;
			state.action = data.action;
			actionNode.innerHTML = state.action;
		});
}

function killTarget(targetKillCode) {
	fetch(`/targetKilled`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			...state,
			targetKillCode: targetKillCode,
		}),
	})
		.then((response) => {
			if (response.status === 403) {
				throw new Error("(403) Invalid kill code");
			}
		})
		.then((response) => response.json())
		.then((data) => {
			console.log(data);
			state.target = data.target;
			state.action = data.action;
			state.kills = data.kills;
			actionNode.innerHTML = state.action;
			killsNodes.forEach((node) => (node.innerHTML = state.kills));
			killCodeNode.innerHTML = state.killCode;
		})
		.catch((e) => {
			if (e.message.includes("403")) {
				alert("Invalid code");
			}
		});
}

function updateGameState() {
	fetch(`/getGameState`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(state),
	})
		.then((response) => response.json())
		.then((data) => {
			if (!data) {
				return;
			}
			// console.log(data);
			state.kills = data.kills;
			state.killCode = data.killCode;
			killsNodes.forEach((node) => (node.innerHTML = state.kills));
			killCodeNode.innerHTML = state.killCode;
			state.status = data.status;
			state.players = data.players;
			state.target = data.target;
			state.action = data.action;
			state.living = data.living;
			state.killedBy = data.killedBy;
			if (state.target) {
				avatarNode.innerHTML = getAvatar(data.players[state.target]);
			}
			actionNode.innerHTML = state.action;
		});
}

function tick() {
	setTimeout(function () {
		// console.log("tick");
		updateGameState();
		renderInterface();
		requestAnimationFrame(tick);
	}, 1000);
}

let previousState = {};
function renderInterface() {
	if (!state.players) {
		return;
	}
	if (
		previousState.status !== state.status ||
		previousState.living !== state.living
	) {
		changeVisibilityOfPages();
	}

	if (previousState.killedBy !== state.killedBy) {
		updateDeathNote();
	}

	if (
		!previousState.players ||
		Object.keys(previousState.players).length !==
			Object.keys(state.players).length
	) {
		updatePlayerList();
	}

	previousState = JSON.parse(JSON.stringify(state));
}

const enterRoomNode = document.querySelector("#enterRoom");
const lobbyNode = document.querySelector("#lobby");
const gameInfoNode = document.querySelector("#gameInfo");
const gameOverNode = document.querySelector("#gameOver");
function changeVisibilityOfPages() {
	console.log("changeVisibilityOfPages", state.status, state.living);
	if (state.status === "started" && !state.living) {
		enterRoomNode.classList.remove("visible");
		lobbyNode.classList.remove("visible");
		gameInfoNode.classList.remove("visible");
		gameOverNode.classList.add("visible");
		return;
	}
	if (state.status === "waiting") {
		enterRoomNode.classList.remove("visible");
		lobbyNode.classList.add("visible");
		gameInfoNode.classList.remove("visible");
		gameOverNode.classList.remove("visible");
		return;
	}
	if (state.status === "started") {
		enterRoomNode.classList.remove("visible");
		lobbyNode.classList.remove("visible");
		gameInfoNode.classList.add("visible");
		gameOverNode.classList.remove("visible");
		return;
	}
	if (!state.status) {
		enterRoomNode.classList.add("visible");
		lobbyNode.classList.remove("visible");
		gameInfoNode.classList.remove("visible");
		gameOverNode.classList.remove("visible");
		return;
	}
}

const playerListNode = document.querySelector("#playerList");
function updatePlayerList() {
	if (!state.players) {
		return;
	}

	let list = "";
	Object.keys(state.players).forEach((player) => {
		list += `
			<li class="playerList_item">
				${player}
				<span class="avatar">${getAvatar(state.players[player])}</span>
			</li>
		`;
	});
	playerListNode.innerHTML = list;
}

const deathNotes = [
	"$killer picked you to death!",
	"$killer confused you breadcrumbs and gobbled you up!",
	"$killer's incessant quacking causes your brain to hemorrhage.",
	"$killer made everyone forget about you. A fate worse than dying! Still, ...",
	"$killer force-feeds you Kehlenschlitzer. You want to die - and you do!",
	"$killer stabs you. You survive only to be run over by a passing raft of ducks!",
	"$killer stabs you. You survive only to be run over by a passing team of ducks!",
	"$killer stabs you. You survive only to be run over by a passing paddling of ducks!",
	"$killer stabs you. You survive only to be run over by a passing pond of ducks!",
	"$killer stabs you. You survive only to be run over by a passing badling of ducks!",
	"$killer pushes you off a cliff. You try to fly, but sadly you are a T-Rex. Splat!",
	"$killer beheads you!",
	"$killer forces you to become a smoker. You die slowly, but still ...",
	"$killer disembowels you with a toothpick of doom!",
	"$killer kills you. Everyone else takes turns looting your mangled corpse!",
	"You ask for help to defeat $killer. Nobody helps because of your smelly socks!",
	"You're about to win against $killer, but someone plays a +10 on them.",
];
const deathNoteNode = document.querySelector("#deathNote");
function updateDeathNote() {
	deathNoteNode.innerHTML = deathNotes[
		Math.floor(Math.random() * deathNotes.length)
	].replace("$killer", state.killedBy);
}

function getAvatar(player) {
	switch (player.avatar) {
		case "duck":
			return "🦆";
		case "tRex":
			return "🦖";
		case "chick":
			return "🐤";
		case "frontChick":
			return "🐥";
		case "babyChick":
			return "🐣";
		case "llama":
			return "🦙";
		case "otter":
			return "🦦";
		case "monkey":
			return "🐒";
		case "penguin":
			return "🐧";
		case "chicken":
			return "🐔";
		case "sloth":
			return "🦥";
		case "shark":
			return "🦈";
		default:
			return "🦆";
	}
}

init();
