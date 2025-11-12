const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri =
  `mongodb+srv://assignment_10:D1YRKfNlUz1K6hAS@cluster0.esrwang.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});;
app.get("/", (req, res) => {
  res.send("Smart server is running");
});


async function run (){
    try{
        await client.connect();

        const db =client.db('assignment_10');
        const productsCollection = db.collection('products')
    //Post a new product API

    app.post("/products", async (req, res) => {
  try {
    const newProduct = req.body;

    newProduct.createdAt = new Date();

    const result = await productsCollection.insertOne(newProduct);
    res.status(201).send(result);
  } catch (error) {
    console.error("Error inserting product:", error);
    res.status(500).send({ message: "Failed to insert product" });
  }
});
    //Latest product API
        app.get("/latest-products", async (req, res) => {
      const cursor = productsCollection
        .find()
        .sort({ created_at: -1 })
        .limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });







        await client.db('admin').command({ping:1});
  console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally{

    }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Smart server is running on port ${port}`);
});