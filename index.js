const express = require('express');
const cors = require('cors');
const jwt = require("jsonwebtoken")
require("dotenv").config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;
// Middleware

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zlzn9.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized Access" })
    }
    const token = authHeader?.split(" ")[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden Access" })
        }
        req.decoded = decoded
        next()
    })
}
async function run() {
    try {
        await client.connect()

        const usersCollection = client.db("note_taker").collection("users")
        const todoCollection = client.db("note_taker").collection("todo")

        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1d" })
            res.send({ result, token })
        })
        app.post('/todo', verifyJWT, async (req, res) => {
            const doctor = req.body;
            const result = await todoCollection.insertOne(doctor)
            res.send(result)
        })
        app.get('/myTodo', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email }
                const todos = await todoCollection.find(query).toArray();
                return res.send(todos);
            } else {
                return res.status(403).send({ message: "Forbidden Access" })
            }
        })
        app.delete("/myTodo/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await todoCollection.deleteOne(query)
            res.send(result)
        })
        app.put("/complete/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const updatedComplete = req.body;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    complete: updatedComplete.complete
                }
            }
            const result = await todoCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        })
    }
    finally {

    }
}

run().catch(console.dir)

app.listen(port, () => {
    console.log(`Listening to port ${port}`)
})

app.get('/', async (req, res) => {
    res.send("Note Taker is running")
})