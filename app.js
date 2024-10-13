const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});


io.on("connection", (uniquesocket) => {
    console.log("A user connected:", uniquesocket.id);

    
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
        return; 
    }

    
    uniquesocket.emit("boardState", chess.fen());

    
    uniquesocket.on("disconnect", () => {
        console.log("User disconnected:", uniquesocket.id);
        if (uniquesocket.id === players.white) {
            delete players.white;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
        }
    });

    
    uniquesocket.on("move", (move) => {
        try {
            
            const currentTurn = chess.turn();
            if (
                (currentTurn === "w" && uniquesocket.id !== players.white) ||
                (currentTurn === "b" && uniquesocket.id !== players.black)
            ) {
                console.log("It's not your turn!");
                return;
            }

            const result = chess.move(move);
            if (result) {
                console.log("Move accepted:", move);
                io.emit("move", move); // Broadcast move to all clients
                io.emit("boardState", chess.fen()); 
            } else {
                console.log("Invalid move attempted:", move);
                uniquesocket.emit("invalidMove", move); 
            }
        } catch (err) {
            console.error("Error handling move:", err);
            uniquesocket.emit("error", "An error occurred while processing your move.");
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, (err) => {
    if (err) {
        console.error("Error starting server:", err);
    } else {
        console.log(`Listening on port ${PORT}`);
    }
});
