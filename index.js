const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const nodemailer = require("nodemailer");
const mg = require('nodemailer-mailgun-transport');
const app = express();
const stripe = require('stripe')('sk_test_51O43YRKDpt7KOvOWQW41uEzaa3kxhYeKkA4oawBqV7YEGKTEsUI5ZmJPWhgB4j3d6tP86I2K8tXm1AWA94xRnXf800cfaGmB5d')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;


// middlewire
app.use(cors())
app.use(express.json())

// let transporter = nodemailer.createTransport({
//     host: 'smtp.sendgrid.net',
//     port: 587,
//     auth: {
//         user: "apikey",
//         pass: process.env.SENDGRID_API_KEY
//     }
// })
const auth = {
    auth: {
        api_key: process.env.EMAIL_PRIVATE_KEY,
        domain: process.env.EMAIL_DOMAIN
    }
}

const transporter = nodemailer.createTransport(mg(auth));




//send payment confermation Email
const sendPaymenytConfirmationEmail = payment => {
    transporter.sendMail({
        from: "mirza.eee.4th@gmail.com", // verified sender email
        to: "mirza.eee.4th@gmail.com", // recipient email
        subject: "Your Order is confirmed. Enjoy the food", // Subject line
        text: "Hello world!", // plain text body
        html: `
        <div>
        <h2> Hello world! </h2>
        <p>Transection Id:${payment.transectionId}</p>
        </div>
        `, // html body
    }, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

}

const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        res.status(401).send({ error: true, message: "Unauthorization Access" })
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: "Unauthorization Access" })
        }
        req.decoded = decoded;
        next();
    })
}


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
        const paymentCollection = client.db('bistroDb').collection('payments')

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '100h' })
            res.send({ token })
        })


        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: "forbidden access" })
            }
            next()
        }


        //users apis
        app.get('/users', verifyJwt, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })
        app.post('/users', async (req, res) => {
            const users = req.body;
            const query = { email: users.email }
            // console.log(users);
            const filter = await usersCollection.findOne(query);
            if (filter) {
                return res.send({ message: 'User is alraday exists' })
            }
            const result = await usersCollection.insertOne(users);
            res.send(result)
        })


        app.get('/users/admin/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.send({ admin: false })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })



        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        //menu apis
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })
        app.post('/menu', verifyJwt, verifyAdmin, async (req, res) => {
            const menuItem = req.body;
            // console.log(menuItem);
            const result = await menuCollection.insertOne(menuItem);
            res.send(result)
        })
        app.delete('/menu/:id', verifyJwt, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const result = await menuCollection.deleteOne(filter);
            res.send(result)
        })

        //reviews apis
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })

        app.post('/carts', async (req, res) => {
            const item = req.body;
            // console.log(item);
            const result = await cartCollection.insertOne(item);
            res.send(result)
        })

        app.get('/carts', verifyJwt, async (req, res) => {
            const email = req.query.email
            // console.log(email);
            const query = { email: email }


            if (!email) {
                res.send([])
            }


            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: "Forbidden Access" })
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
        // Payment 
        app.post('/create-payment-intent', verifyJwt, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })


            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })
        // Payment related Api
        app.post('/payment', verifyJwt, async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment)
            const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
            const deleteResult = await cartCollection.deleteMany(query);
            sendPaymenytConfirmationEmail(payment)
            res.send({ result, deleteResult })
        })


        app.get('/admin-stats', async (req, res) => {
            const users = await usersCollection.estimatedDocumentCount()
            const products = await menuCollection.estimatedDocumentCount()
            const orders = await cartCollection.estimatedDocumentCount()

            const payment = await paymentCollection.find().toArray()
            const price = payment.reduce((a, b) => a + parseFloat(b.price), 0)
            const totalprice = price.toFixed(2)


            // const sum = await paymentCollection.aggregate( [
            //     {
            //       $group: 
            //         {
            //           _id: null, 
            //           total: { $sum: "$price" } 
            //         } 
            //     }
            //   ] ).toArray()

            // res.send({
            //     users, products, orders, totalprice, price,sum:sum[0].total
            // })


            res.send({
                users, products, orders, totalprice
            })
        })

        // app.get('/order-stats', async (req, res) => {
        //     const pipeline = [
        //         {
        //             $lookup: {
        //                 from: 'menu',
        //                 localField: 'menuItems',
        //                 foreignField: '_id',
        //                 as: 'menuItemsData'
        //             },
        //         },
        //         {
        //             $unwind: '$menuItemsData'
        //         },
        //         {
        //             $group: {
        //                 _id: '$menuItemsData.category',
        //                 count: { $sum: 1 },
        //                 total: { $sum: '$menuItemsData.price' }
        //             }
        //         }, {
        //             $project: {
        //                 category: '$_id',
        //                 count: 1,
        //                 total: { $round: ['$total', 2] },
        //                 _id: 0
        //             }
        //         }
        //     ];

        //     // const result = await paymentCollection.aggregate(pipeline).toArray()
        //     // res.send(result)

        //     const result = await paymentCollection.aggregate(pipeline).toArray()
        //     res.send(result)
        // })



        app.get('/order-stats', async (req, res) => {
            const pipeline = [
                {
                    $lookup: {
                        from: 'menu',
                        localField: 'menuItems',
                        foreignField: '_id',
                        as: 'menuItemsData'
                    }
                },
                {
                    $unwind: '$menuItemsData'
                },
                {
                    $group: {
                        _id: '$menuItemsData.category',
                        count: { $sum: 1 },
                        total: { $sum: '$menuItemsData.price' }
                    }
                },
                {
                    $project: {
                        category: '$_id',
                        count: 1,
                        total: { $round: ['$total', 2] },
                        _id: 0
                    }
                }
            ];

            const result = await paymentCollection.aggregate(pipeline).toArray()
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
    console.log("BistroBoss is running", port);
})

