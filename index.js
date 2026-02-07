const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://assignment_10:D1YRKfNlUz1K6hAS@cluster0.esrwang.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  await client.connect();
  const db = client.db("assignment_10");
  cachedDb = db;
  return db;
}

app.get("/", (req, res) => {
  res.send("Smart server is running");
});

// Post a new product API
app.post("/products", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const productsCollection = db.collection("products");
    const newProduct = req.body;
    newProduct.createdAt = new Date();
    const result = await productsCollection.insertOne(newProduct);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to insert product" });
  }
});

// Latest product API
app.get("/latest-products", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const productsCollection = db.collection("products");
    const cursor = productsCollection
      .find()
      .sort({ created_at: -1 })
      .limit(8);
    const result = await cursor.toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch latest products" });
  }
});

// GET all products OR category-based products
app.get("/products", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const productsCollection = db.collection("products");
    const { category } = req.query;

    const query = {};
    if (category) {
      query.category = category.toLowerCase();
    }

    const products = await productsCollection.find(query).toArray();
    res.send(products);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch products" });
  }
});

// Product Details API
app.get("/productDetails/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const productsCollection = db.collection("products");
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await productsCollection.findOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch product details" });
  }
});

// Product Patch API
app.patch("/products/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const productsCollection = db.collection("products");
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
  } catch (error) {
    res.status(500).send({ message: "Failed to update product" });
  }
});

// My import POST
app.post("/myImport", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const myImportCollection = db.collection("myimport");
    const newImport = req.body;
    const { user_email, product_name, product_id, imported_quantity } =
      newImport;

    if (!user_email || !product_name || !product_id) {
      return res.status(400).send({ message: "Missing required fields" });
    }

    // Check if product already exists for this user
    const existing = await myImportCollection.findOne({
      user_email,
      product_id,
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
        updateResult,
      });
    }

    // Insert new import if not found
    const result = await myImportCollection.insertOne({
      ...newImport,
      createdAt: new Date(),
    });

    res.status(201).send({
      message: "Product imported successfully",
      inserted: true,
      result,
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to insert or update product",
      error,
    });
  }
});

// My import GET
app.get("/myImport", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const myImportCollection = db.collection("myimport");
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

// My import DELETE
app.delete("/myImport/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const myImportCollection = db.collection("myimport");
    const id = req.params.id;

    const result = await myImportCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete import", error });
  }
});

// ADD EXPORT PRODUCT API
app.post("/exportProduct", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const productsCollection = db.collection("products");
    const myExportCollection = db.collection("myexport");
    const {
      product_name,
      product_image,
      price,
      origin_country,
      rating,
      available_quantity,
      discount_price,
      product_description,
      user_email,
    } = req.body;

    if (!product_name || !user_email) {
      return res.status(400).send({ message: "Missing required fields" });
    }

    const newProduct = {
      product_name,
      product_image,
      price,
      origin_country,
      rating,
      available_quantity,
      discount_price,
      product_description,
      createdAt: new Date(),
    };

    // Insert into products collection
    const productResult = await productsCollection.insertOne(newProduct);

    // Insert into myexport collection with user email + reference to original product
    const exportProduct = {
      ...newProduct,
      user_email,
      original_product_id: productResult.insertedId,
    };

    const exportResult = await myExportCollection.insertOne(exportProduct);

    res.status(201).send({
      message: "Product exported successfully",
      productResult,
      exportResult,
    });
  } catch (error) {
    res.status(500).send({ message: "Failed to export product", error });
  }
});

// GET EXPORT PRODUCTS API
app.get("/myExport", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const myExportCollection = db.collection("myexport");
    const userEmail = req.query.email;

    if (!userEmail) {
      return res.status(400).send({ message: "User email is required" });
    }

    const exports = await myExportCollection
      .find({ user_email: userEmail })
      .toArray();

    res.send(exports);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch exports", error });
  }
});

// UPDATE EXPORT PRODUCT API
app.patch("/exportProduct/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const productsCollection = db.collection("products");
    const myExportCollection = db.collection("myexport");
    const id = req.params.id;
    const {
      product_name,
      product_image,
      price,
      origin_country,
      rating,
      available_quantity,
      discount_price,
      product_description,
    } = req.body;

    const updateData = {
      $set: {
        product_name,
        product_image,
        price,
        origin_country,
        rating,
        available_quantity,
        discount_price,
        product_description,
      },
    };

    // Update in myexport collection
    const exportResult = await myExportCollection.updateOne(
      { _id: new ObjectId(id) },
      updateData
    );

    // Find original product ID
    const exportDoc = await myExportCollection.findOne({
      _id: new ObjectId(id),
    });
    const productId = exportDoc.original_product_id;

    // Update in products collection
    const productResult = await productsCollection.updateOne(
      { _id: new ObjectId(productId) },
      updateData
    );

    res.send({ message: "Product updated", exportResult, productResult });
  } catch (error) {
    res.status(500).send({ message: "Failed to update product", error });
  }
});

// DELETE EXPORT PRODUCT API
app.delete("/exportProduct/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const productsCollection = db.collection("products");
    const myExportCollection = db.collection("myexport");
    const id = req.params.id;

    // Delete from myexport collection
    const exportDoc = await myExportCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!exportDoc) return res.status(404).send({ message: "Not found" });

    const deleteExport = await myExportCollection.deleteOne({
      _id: new ObjectId(id),
    });

    // Delete from products collection
    const deleteProduct = await productsCollection.deleteOne({
      _id: new ObjectId(exportDoc.original_product_id),
    });

    res.send({ message: "Product deleted", deleteExport, deleteProduct });
  } catch (error) {
    res.status(500).send({ message: "Failed to delete product", error });
  }
});

// Start server only in development or when not on Vercel
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Smart server is running on port ${port}`);
  });
}

// Export for Vercel
module.exports = app;