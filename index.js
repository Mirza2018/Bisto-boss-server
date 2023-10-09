const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;


// middlewire
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send("Bistro Bosss Server is On ")
})



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4fvtstz.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const menuCollection = client.db('bistroDb').collection('menu')
        const usersCollection = client.db('bistroDb').collection('users')
        const reviewCollection = client.db('bistroDb').collection('reviews')
        const cartCollection = client.db('bistroDb').collection('carts')

        //users apis
        app.post('/users', async (req, res) => {

            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        //menu apis
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })


        //reviews apis
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })

        app.post('/carts', async (req, res) => {
            const item = req.body;
            console.log(item);
            const result = await cartCollection.insertOne(item);
            res.send(result)
        })

        app.get('/carts', async (req, res) => {
            const email = req.query.email
            console.log(email);
            const query = { email: email }
            if (!email) {
                res.send([])
            }
            const result = await cartCollection.find(query).toArray();
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(filter);
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log("port no mirza is", port);
})

