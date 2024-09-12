const express = require('express');
const app = express();
const cors = require('cors');
const moment = require('moment');
const stripe = require("stripe")('sk_test_51PxwAqFUfWsQSXsiG948bWvez4aRGW8zch3wd8GrcH8GtgnYtzDLOp3GsPgqguHYcxLTO6XQL45MnRGq22dq2qKy00C0kJ4013');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Replace the placeholder with your Atlas connection string
const uri = process.env.MONGO_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   }
}
);

async function run() {
   try {
      // Connect the client to the server (optional starting in v4.7)
      await client.connect();

      const database = client.db('self_directed_projects');
      const usersGathering = database.collection('users');
      const storesGathering = database.collection('stores');
      const cartsGathering = database.collection('carts');
      const paymentsGathering = database.collection('payments');

      app.get("/APIs/users", async (req, res) => {
         const result = await usersGathering.find().toArray();
         res.send(result);
      })

      app.get("/APIs/users/:uid", async (req, res) => {
         const uid = req.params.uid;
         const query = { _id: new ObjectId(uid) };
         const result = await usersGathering.findOne(query);
         res.send(result);
      })

      app.post("/APIs/users", async (req, res) => {
         const user = req.body;
         console.log(user);
         const query = { email: user.email };
         const existingUser = await usersGathering.findOne(query);
         if (existingUser) {
            return res.send({ message: "User account already registered.", insertedId: null });
         }
         const result = await usersGathering.insertOne(user);
         res.send(result);
      })

      app.patch("/APIs/users/:uid", async (req, res) => {
         const job = req.body;
         const uid = req.params.uid;
         const filter = { _id: new ObjectId(uid) };
         const updateDoc = {
            $set: {
               role: job.role,
            }
         }
         const result = await usersGathering.updateOne(filter, updateDoc);
         res.send(result);
      })

      app.delete("/APIs/users/:uid", async (req, res) => {
         const uid = req.params.uid;
         const query = { _id: new ObjectId(uid) }
         const result = await usersGathering.deleteOne(query);
         res.send(result);
      })

      // digital offerings
      app.get("/APIs/digital-offerings", async (req, res) => {
         const result = await storesGathering.find().toArray();
         res.send(result);
      })

      app.get("/APIs/digital-offerings/:pid", async (req, res) => {
         const pid = req.params.pid;
         const query = { _id: new ObjectId(pid) };
         const result = await storesGathering.findOne(query);
         res.send(result);
      })

      // your carts
      app.get('/APIs/carts', async (req, res) => {
         const email = req.query.email;
         const query = { email: email };
         const result = await cartsGathering.find(query).toArray();
         res.send(result);
         // console.log(result);
      })

      app.post('/APIs/carts', async (req, res) => {
         const jobCarts = req.body;
         jobCarts.stores_id = new ObjectId(jobCarts.stores_id);
         console.log(jobCarts.stores_id);
         const result = await cartsGathering.insertOne(jobCarts);
         res.send(result);
      })

      // create-payment-intent
      const calculateOrderAmount = (coins) => {
         const amount = parseInt(coins * 100);
         return amount;
      };

      app.post("/APIs/create-payment-intent", async (req, res) => {
         const { coins } = req.body;

         // Create a PaymentIntent with the order amount and currency
         const paymentIntent = await stripe.paymentIntents.create({
            amount: calculateOrderAmount(coins),
            currency: "usd",
            automatic_payment_methods: {
               enabled: true,
            },
            /* https://docs.stripe.com/api/payment_methods/object */
            // payment_method_types: payment_method_types
         });

         res.send({
            clientSecret: paymentIntent.client_secret,
         });
      });

      app.post('/APIs/payments', async (req, res) => {
         try {
            const doc = req.body;
            console.log(doc);
            doc.carts_id = doc.carts_id.map(job => new ObjectId(job));
            doc.products_id = doc.products_id.map(job => new ObjectId(job));
            const paymentsResult = await paymentsGathering.insertOne(doc);
            const query = {
               _id: {
                  // $in: doc.carts_id.map(job => new ObjectId(job))
                  $in: doc.carts_id
               }
            }
            const deleteResult = await cartsGathering.deleteMany(query);
            res.send({ paymentsResult, deleteResult });
         }
         catch (error) {
            console.error('Error in /payments endpoint:', error);
            res.status(500).send('Internal Server Error');
         }
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

app.get('/', (req, res) => {
   res.send('Hello World!')
})

app.listen(port, () => {
   console.log(`Example app listening on port ${port}`)
})