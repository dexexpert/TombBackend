const express = require("express");
const Web3 = require("web3");
const { abi } = require("@uniswap/v2-core/build/IUniswapV2Pair.json");
const { ChainId, Token, WETH, Fetcher, Route } = require("@uniswap/sdk");
const { BigNumber } = require("bignumber.js");
const fetch = require("cross-fetch");
// Create a new Web3 Instance
const web3 = new Web3("https://matic-mainnet-full-rpc.bwarelabs.com");

const PoolInfos = [
  {
    poolName: "PDDollar-Matic",
    vault: "0x6F85a47ba7E96798Af45AE094891Bd4a426A0bE1",
    LPToken: "0xebca34c9fc0be6a37deaf62ddd064941f53ed246",
    allocPoint: 90000,
  },
  {
    poolName: "PDDollar-PolyDodge",
    vault: "0x5A0d45b8150c0de586d3BdF82C38C9706c6186a8",
    LPToken: "0xc8ecb75d92de09ff8e7f4d93675e253ec6b08519",
    allocPoint: 10000,
  },
  {
    poolName: "PDDollar-USDC",
    vault: "0x5Beb97A339c357ab8325aD8cD7aF97299EF080b8",
    LPToken: "0x9f48f74db18d082e5d22da3375c72c7eaf7a9ef3",
    allocPoint: 25000,
  },
  {
    poolName: "PDShare-ETH",
    vault: "0x52bA951e6459F7e70fD84BcB46CF8c5fABA35bd1",
    LPToken: "0x03afc0563b287caace97b1de84e087fe5e478027",
    allocPoint: 15000,
  },
  {
    poolName: "PDShare-Matic",
    vault: "0xb32A26190953510c23E719082910964622334dB9",
    LPToken: "0xa7c858261f33debb1718a6d417e3e4fbffd9e01b",
    allocPoint: 15000,
  },
  {
    poolName: "PDShare-PDDollar",
    vault: "0x3D34802B80585175927b2cFB467a3886f77bedFa",
    LPToken: "0x9e2429b0cd620db724b68083a43434a3d3902fff",
    allocPoint: 45000,
  },
  {
    poolName: "PolyDodge",
    vault: "0x5743f6768A9AeEdcf7bf6650B2C3b4bC73bC9cAC",
    LPToken: "0x8a953cfe442c5e8855cc6c61b1293fa648bae472",
    allocPoint: 10000,
  },
];

// Replace the addresses to point to your Farming Contract
// and LP Token Contract on the desired network
const REWARD_TOKEN_ADDRESS = "0x3068382885602fc0089aec774944b5ad6123ae60"; // pd share address
const chef_address = "0x9682D175830643658798ac3367915e57bDdB506A";

// Get DOGECOIN price in MATIC
const getTokenPriceInMatic = async (tokenAddress, param) => {
  const response = await fetch(
    "https://deep-index.moralis.io/api/v2/erc20/" +
      tokenAddress +
      "/price?chain=polygon&exchange=0x5757371414417b8c6caad45baef941abc7d3ab32",
    {
      headers: {
        accept: "application/json",
        "x-api-key":
          "W8r1QYNruDdvTCk2qrHilE9zecPNaLTRP1i1S20QIoP6sTul2yv3dmwPEa3LHChz",
      },
    }
  );

  const priceData = await response.json();
  const returnData =
    param === true ? priceData["usdPrice"] : priceData["nativePrice"].value;
  return returnData; //Address of DOGECOIN on BSC Mainnet
};

const getLpTokenReserves = async (lpAddress) => {
  try {
    const LpTokenContract = new web3.eth.Contract(abi, lpAddress);
    const totalReserves = await LpTokenContract.methods.getReserves().call();
    // For ETH/DOGE Pool totalReserves[0] = ETH Reserve and totalReserves[1] = DOGE Reserve
    // For BNB/DOGE Pool totalReserves[0] = BNB Reserve and totalReserves[1] = DOGE Reserve
    return [totalReserves[0], totalReserves[1]];
  } catch (e) {
    console.log(e);
    return [0, 0];
  }
};

const getLpTokenTotalSupply = async (lpAddress) => {
  try {
    const LpTokenContract = new web3.eth.Contract(abi, lpAddress);
    const totalSupply = await LpTokenContract.methods.totalSupply().call();
    return totalSupply;
  } catch (e) {
    console.log(e);
    return 0;
  }
};
const getLpUnderlyingTokens = async (lpAddress) => {
  try {
    const LpTokenContract = new web3.eth.Contract(abi, lpAddress);
    const token0 = await LpTokenContract.methods.token0().call();
    const token1 = await LpTokenContract.methods.token1().call();
    // For ETH/DOGE Pool totalReserves[0] = ETH Reserve and totalReserves[1] = DOGE Reserve
    // For BNB/DOGE Pool totalReserves[0] = BNB Reserve and totalReserves[1] = DOGE Reserve
    return [token0, token1];
  } catch (e) {
    console.log(e);
    return [0, 0];
  }
};
const calculateLpTokenPrice = async (lpAddress, withUSD) => {
  // For Price IN ETH
  // Reward Token is Dodgecoin in our case
  // rewardTokenPrice = await getDogecoinPriceInETH();

  tokenAddresses = await getLpUnderlyingTokens(lpAddress);

  // For Price in BNB
  // If you want to do calculations in BNB uncomment line below and comment line number 5
  token0Price = await getTokenPriceInMatic(tokenAddresses[0], withUSD);
  token1Price = await getTokenPriceInMatic(tokenAddresses[1], withUSD);

  // 1 * rewardTokenPrice because 1 is the price of ETH or BNB in respective mainnet
  // This is square root of (p0 * p1) with reference to the image above
  const tokenPriceCumulative = new BigNumber(token0Price * token1Price).sqrt();

  // For ETH / DOGE pair totalReserve[0] = ETH in the contract and totalReserve[1] = DOGE in the contract
  // For BNB / DOGE pair totalReserve[0] = BNB in the contract and totalReserve[1] = DOGE in the contract
  const totalReserve = await getLpTokenReserves(lpAddress);

  // This is square root of (r0 * r1) with reference to the image above
  const tokenReserveCumulative = new BigNumber(totalReserve[0])
    .times(totalReserve[1])
    .sqrt();

  // Total Supply of LP Tokens in the Market
  const totalSupply = await getLpTokenTotalSupply(lpAddress);

  // Calculate LP Token Price in accordance to the image above
  const lpTokenPrice = tokenReserveCumulative
    .times(tokenPriceCumulative)
    .times(2)
    .div(totalSupply);

  // If lpTokenPrice is a valid number return lpTokenPrice or return 0
  return lpTokenPrice.isNaN() || !lpTokenPrice.isFinite()
    ? 0
    : lpTokenPrice.toNumber();
};

const calculateAPY = async (vaultAddress, lpAddress, allocPoint) => {
  try {
    //BLOCKS_PER_DAY varies acccording to network all values are approx and they keep changing
    //BLOCKS_PER_DAY = 21600 for Kovan Testnet
    //BLOCKS_PER_DAY = 28800 for BSC Testnet
    //BLOCKS_PER_DAY = 6400 for Ethereum Mainnet
    //I am using the value for Ethereum mainnet
    const BLOCKS_PER_YEAR = 370;

    let rewardTokenPrice = 0;
    // For Price IN ETH
    // Reward Token is Dodgecoin in our case
    // rewardTokenPrice = await getDogecoinPriceInETH();

    // For Price in BNB
    // If you want to do calculations in BNB uncomment line below and comment line number 13
    rewardTokenPrice = await getTokenPriceInMatic(REWARD_TOKEN_ADDRESS);
    console.log(rewardTokenPrice);

    // REWARD_PER_BLOCK = Number of tokens your farming contract gives out per block
    const REWARD_PER_SECOND = (2815315000000000 / 210000) * allocPoint;
    const totalRewardPricePerYear = new BigNumber(rewardTokenPrice)
      .times(REWARD_PER_SECOND)
      .times(3600 * 24)
      .times(BLOCKS_PER_YEAR);

    console.log(REWARD_PER_SECOND);

    // Get Total LP Tokens Deposited in Farming Contract
    const LpTokenContract = new web3.eth.Contract(abi, lpAddress);

    console.log("tokentoken LP");

    const totalLpDepositedInFarmingContract = await LpTokenContract.methods
      .balanceOf(chef_address)
      .call();

    console.log("depo", totalLpDepositedInFarmingContract);

    // Calculate LP Token Price
    const lpTokenPrice = await calculateLpTokenPrice(lpAddress);
    console.log("lptoken price", lpTokenPrice);

    // Calculate Total Price Of LP Tokens in Contract
    const totalPriceOfLpTokensInFarmingContract = new BigNumber(
      lpTokenPrice
    ).times(totalLpDepositedInFarmingContract);

    // Calculate APY
    const apy = totalRewardPricePerYear
      .div(totalPriceOfLpTokensInFarmingContract)
      .times(100);

    // Return apy if apy is a valid number or return 0
    return apy.isNaN() || !apy.isFinite() ? 0 : apy.toNumber();
  } catch (e) {
    console.log(e);
    return 0;
  }
};

const app = express();

const bodyParser = require("body-parser");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/price", async (req, res, next) => {
  val = await calculateLpTokenPrice(
    PoolInfos[req.query.poolId].LPToken,
    true // it means with usd
  );
  console.log("val", val);
  res.send({ price: val + "$" });
});

app.get("/apy", async (req, res, next) => {
  val = await calculateAPY(
    PoolInfos[req.query.poolId].vault,
    PoolInfos[req.query.poolId].LPToken,
    PoolInfos[req.query.poolId].allocPoint
  );
  console.log(val);
  res.send({ apy: val + "%" });
});

app.get("/apr", async (req, res, next) => {
  val =
    (await calculateAPY(
      PoolInfos[req.query.poolId].vault,
      PoolInfos[req.query.poolId].LPToken,
      PoolInfos[req.query.poolId].allocPoint
    )) / 100.0;
  console.log(val);
  res.send({
    daily_apr: (Math.exp(Math.log(val) / 365.0) - 1.0) * 100.0 + "%",
  });
});

app.get("");
app.get("/", function (req, res) {
  res.send("we are at the root route of our server");
});
const server = app.listen(3000, function () {
  let host = server.address().address;
  let port = server.address().port;
  // Starting the Server at the port 3000

  console.log(host.toString() + " : " + port);
});
