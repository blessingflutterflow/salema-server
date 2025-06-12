import bcrypt from "bcrypt";

const password = "Pass1234";

bcrypt.hash(password, 10).then(hash => {
  console.log("Generated hash:", hash);
});
