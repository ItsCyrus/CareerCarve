const express = require("express");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

const app = express();
const port = 3000;

// Connect to MongoDB
const mongoURI = "mongodb://localhost:27017";
const client = new MongoClient(mongoURI, { useUnifiedTopology: true });

// Database and collection names
const dbName = "questionnaireDB";
const collectionName = "questionnaireCollection";

app.use(express.json());

// Endpoint 1: Simple request response endpoint
app.get("/api/welcome", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API successfully called",
  });
});

// Endpoint 2: Sign up endpoint
app.post("/api/signup", async (req, res) => {
  const { name, email, password, phone_number } = req.body;

  // Encrypt the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Store the user data in the database
  const collection = client.db(dbName).collection(collectionName);
  await collection.insertOne({
    name,
    email,
    password: hashedPassword,
    phone_number,
  });

  res.json({
    success: true,
    message: "Signed up successfully",
  });
});

// Endpoint 3: Sign in endpoint
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  // Retrieve the user from the database
  const collection = client.db(dbName).collection(collectionName);
  const user = await collection.findOne({ email });

  // Check if the user exists and the password matches
  if (user && (await bcrypt.compare(password, user.password))) {
    // Assuming a function verifyPassword is defined
    const message = await fetchMessageFromExternalAPI(); // Assuming a function fetchMessageFromExternalAPI is defined
    res.json({
      success: true,
      message,
    });
  } else {
    res.json({
      success: false,
      message: "Invalid email or password",
    });
  }
});

// Endpoint 4: Edit or add phone number
app.put("/api/edit/phonenumber", async (req, res) => {
  const { phone_number } = req.body;
  const authToken = req.headers.authorization; // Assuming authentication is implemented

  // Update the user's phone number in the database
  const collection = client.db(dbName).collection(collectionName);
  await collection.updateOne(
    { authToken }, // Assuming authToken is used as a unique identifier for the user
    { $set: { phone_number } }
  );

  res.json({
    success: true,
    message: "Phone number changed / added successfully",
  });
});

// Function to retrieve the test details from the database based on the test ID
async function getTestDetailsFromDatabase(testId) {
  // Assuming you have a collection named 'tests' in the database to store the test details
  const collection = client.db(dbName).collection("tests");

  // Assuming the test details are stored as documents in the 'tests' collection with a unique testId field
  const testDetails = await collection.findOne({ testId });

  return testDetails;
}

// Function to compare the user's answer with the correct answer(s) for a question
function compareAnswers(correctAnswers, userAnswer) {
  // Assuming correctAnswers and userAnswer are arrays of answer IDs
  // Check if the arrays have the same length
  if (correctAnswers.length !== userAnswer.length) {
    return false;
  }

  // Check if each answer ID in the correctAnswers array is present in the userAnswer array
  for (const answerId of correctAnswers) {
    if (!userAnswer.includes(answerId)) {
      return false;
    }
  }

  return true;
}

// Function to calculate the score based on the test ID and user's answers
function calculateScore(testId, answers) {
  // Retrieve the test details from the database based on the test ID
  const testDetails = getTestDetailsFromDatabase(testId); // Assuming a function getTestDetailsFromDatabase is defined

  // Calculate the score
  let totalQuestions = 0;
  let correctAnswers = 0;

  // Iterate over each question in the test details
  for (const question of testDetails.questions) {
    totalQuestions++;

    // Check if the user's answer matches the correct answer(s) for the question
    if (compareAnswers(question.correctAnswers, answers[question.questionId])) {
      correctAnswers++;
    }
  }

  // Calculate the percentage score
  const score = (correctAnswers / totalQuestions) * 100;

  return score;
}

// Endpoint: Submit test
app.post("/submit-test", async (req, res) => {
  const { userId, testId, answers } = req.body;

  // Calculate the score based on the test ID and user's answers
  const score = calculateScore(testId, answers);

  // Store the user's test response and score in the database
  const collection = client.db(dbName).collection(collectionName);
  await collection.insertOne({
    userId,
    testId,
    answers,
    score,
  });

  res.json({
    userId,
    testId,
    score,
  });
});

// Create a sample test and store it in the database
async function createSampleTest() {
  const testId = "sample-test-1";

  // Assuming you have a collection named 'tests' in the database to store the test details
  const collection = client.db(dbName).collection("tests");

  // Sample test details
  const testDetails = {
    testId,
    testName: "Sample Test 1",
    questions: [
      {
        questionId: "q1",
        questionText: "What is the capital of France?",
        options: [
          { optionId: "q1o1", optionText: "Paris", isCorrect: true },
          { optionId: "q1o2", optionText: "London", isCorrect: false },
          { optionId: "q1o3", optionText: "Berlin", isCorrect: false },
          { optionId: "q1o4", optionText: "Rome", isCorrect: false },
        ],
        correctAnswers: ["q1o1"], // Assuming correctAnswers is an array of answer option IDs
      },
      // Add more questions here
    ],
  };

  await collection.insertOne(testDetails);

  console.log("Sample test created and stored in the database");
}

// Connect to MongoDB and start the server
client.connect((err) => {
  if (err) {
    console.error("Error connecting to MongoDB", err);
    return;
  }

  console.log("Connected to MongoDB");

  // Create the sample test
  createSampleTest().catch((error) => {
    console.error("Error creating the sample test", error);
  });

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
