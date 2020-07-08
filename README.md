# Atlas Trading System
## Exchange Arbitrage
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
