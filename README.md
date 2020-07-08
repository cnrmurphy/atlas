# Atlas Trading System
## Spatial Arbitrage
At times you will see the same asset trading at different prices on exchanges.
For instance, on FTX you will often see the best bid price for ETH trading
at 238.89 while on Coinbase Pro the best bid price for ETH will be trading at 238.81 - a .08 spread.
This means you can buy ETH on Coinbase Pro for cheaper price and sell ETH
on FTX for a higher price earning .08 on the trade. Yes, it's a small return, but if you simulate this
trade 1000 times it will begin to add up, netting you 80. Do this every day for the year and you could earn
a return of $29,200 - not bad.
## Optimizations
There are many optimizations to consider for this trading strategy. The first that comes to mind is to optimize
the rebalancing process when you shift from delta neutral. For example, at the beginning of your trade you should have
an even split of cash and the asset your trading on each exchange. If you are trading with $10,000 then you should have
$5,000 on FTX and $5,000 on Coinbase Pro. If you are trading ETH then you should own $2,500 worth of ETH and have $2,500
cash available. When you want to make a trade on the spreads, you will buy $2,500 worth of ETH on Coinbase Pro while selling
$2,500 worth of ETH on FTX - effectively earning the spread across the exchanges. Now you will have $5,000 ETH on Coinbase Pro
and $5,000 + {earned_spread} on FTX. In order to become delta neutral on each exchange, you will have to once again split your positions.
The optimization we want to consider is buying/selling on the respective exchange such that we will not pay more for our transaction
than we should. A naive implementation of our arbitrage strategy will attempt to become delta neutral by buying at the best price. This
runs the risk of clearing a level in the orderbook and forcing us to pay a higher price for each following exchange. Instead we should
be sure never to just keep transacting after clearing a level in the orderbook and instead dicate our transaction based on a metric
such as VWAP.
## Why does it exist?
It makes a lot of sense that this spatial arbitrage exists. Unlike traditional equity markets, the liquidity
in crypto markets is very fragmented because of the amount of exchanges that exists. The consequence of this 
is that each venue has differing amounts of liquidity. An exchange that has more liquidity will have better volume
and therefore better price discovery. Furthermore, the properties of crypto currencies themselves make it difficult
for prices accross exchanges to converge. For example, Bitcoin can take quite a while to transfer across exchanges.
The price of Bitcoin is also very volatile. Therefore, there is a large amount of risk in arbitraging the pricing
inefficiency away. Liquidity, high transactions fees, velocity of money, and volatility are all reasons why
this pricing inefficiency exists. If larger market makers were to offer liquidity by trading this spatial arbitrage
then it would likely disappear as prices across exchanges converge (it may always be there to some extend given some of
the aforementioned factors). The reason for the lack of these larger market makers (such as institutions) is most likely
due to the risk of keeping large amounts of capital on a crypto exchange (hacks run rampant and owners sometimes go rouge)
and the difficulty of getting large amounts of capital on  crypto exchanges in the first place.