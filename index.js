const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const myImportCollection = db.collection('myimport')
    //Post a new product API

    app.post("/products", async (req, res) => {
  try {
    const newProduct = req.body;

    newProduct.createdAt = new Date();

    const result = await productsCollection.insertOne(newProduct);
    res.status(201).send(result);
  } catch (error) {;
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
        //all product API
    app.get("/allProducts", async(req,res)=>{
        const products = await productsCollection.find().toArray();
        res.send(products)
    })
    app.get("/productDetails/:id", async(req,res)=>{
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.findOne(query);
             res.send(result);
    });
    app.patch("/products/:id", async (req, res) => {
  const id = req.params.id;
  const updateProduct = req.body;
  const query = { _id: new ObjectId(id) };
  const update = {
    $set: {
      available_quantity: updateProduct.available_quantity,
    },
  };
  const result = await productsCollection.updateOne(query, update);
  res.send(result);
});

//My import 
app.post("/myImport", async (req, res) => {
  try {
    const newImport = req.body;
    const { user_email, product_name, imported_quantity } = newImport;

    if (!user_email || !product_name) {
      return res.status(400).send({ message: "Missing required fields" });
    }

    // Check if product already exists for this user
    const existing = await myImportCollection.findOne({
      user_email,
      product_name
    });

    if (existing) {
      // Update quantity instead of adding a new entry
      const updatedQuantity =
        existing.imported_quantity + (imported_quantity || 1);

      const updateResult = await myImportCollection.updateOne(
        { _id: existing._id },
        { $set: { imported_quantity: updatedQuantity } }
      );

      return res.send({
        message: "Quantity updated",
        updated: true,
        updateResult
      });
    }

    // Insert new import if not found
    const result = await myImportCollection.insertOne({
      ...newImport,
      createdAt: new Date()
    });

    res.status(201).send({
      message: "Product imported successfully",
      inserted: true,
      result
    });

  } catch (error) {
    res.status(500).send({
      message: "Failed to insert or update product",
      error
    });
  }
});


// My import get API
// GET: Fetch all imported products for a specific user
app.get("/myImport", async (req, res) => {
  try {
    const userEmail = req.query.email;

    if (!userEmail) {
      return res.status(400).send({ message: "User email is required" });
    }

    const result = await myImportCollection
      .find({ user_email: userEmail })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch imports", error });
  }
});

// DELETE: Remove imported product by ID
app.delete("/myImport/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await myImportCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete import", error });
  }
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