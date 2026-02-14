const express = require("express");
const fs = require("fs");
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let getAuthUsers = require("./auth_users.js").getAuthUsers;
const public_users = express.Router();

public_users.post("/register", async (req, res) => {
  let users = await getAuthUsers();
  let username = req.body.username;
  let password = req.body.password;
  const existingUser = users.find((u) => u.username === username);
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  let newUser = {
    id: users.length + 1,
    username: username,
    password: password,
  };
  users = [...users, newUser];

  fs.writeFileSync("./router/usersdb.json", JSON.stringify(users, null, 4));

  res.status(201).json({ message: "User registered successfully" });
});

public_users.get("/", function (req, res) {
  return res.status(200).json({ data: books });
});

public_users.get("/isbn/:isbn", function (req, res) {
  let isbn = req.params.isbn;
  if (isNaN(isbn)) {
    return res.status(400).json({ message: "Bad request." });
  }
  let book = books[isbn];
  if (book) {
    return res.status(200).json({ data: book });
  }
  return res.status(404).json({ message: "Not found." });
});

public_users.get("/author/:author", function (req, res) {
  let author = req.params.author;
  const result = {};

  for (let isbn in books) {
    if (books[isbn].author === author) {
      result[isbn] = books[isbn];
    }
  }
  return res.status(200).json({ data: result });
});

public_users.get("/title/:title", function (req, res) {
  let title = req.params.title;
  const result = {};

  for (let isbn in books) {
    if (books[isbn].title === title) {
      result[isbn] = books[isbn];
    }
  }
  return res.status(200).json({ data: result });
});

public_users.get("/review/:isbn", function (req, res) {
  let isbn = req.params.isbn;
  let result = {};

  for (let i in books) {
    if (i === isbn) {
      result = books[i].reviews;
    }
  }
  return res.status(200).json({ data: result });
});

module.exports.general = public_users;
