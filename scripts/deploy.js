async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const HealthcareUniversity = await ethers.getContractFactory("HealthcareUniversity");
  const healthcareUniversity = await HealthcareUniversity.deploy();

  await healthcareUniversity.deployed();
  console.log("HealthcareUniversity deployed to:", healthcareUniversity.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });