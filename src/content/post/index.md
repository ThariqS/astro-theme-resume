---
title: 'Crypto ELI5'
description: "An explainer of a 'toy crypto' currency to help build intuition on how the block chain works."
publishDate: '22 Feb 2018'
tags: ['old']
---

_This is an explanation of cryptocurrencies that tries to be as intuitive as possible using only basic mathematics and analogies with minimal jargon._

_In this example I create an imaginary cryptocurrency based on Prime Numbers called Primecoin. Primecoin is very similar to Bitcoin in many ways, but it is significantly simpler. If you understand Primecoin you will understand the primary mechanisms by which Bitcoin works._

**What is a coin?**

A coin at its essence is a number which fits a certain equation.

Each cryptocurrency has a different equation associated with it, and there are a set of numbers which fit that equation. Finding these coins/numbers is difficult, but once you find them, it is easy for other people to verify that it is a coin.

For example, imagine _Primecoin_, where each prime number is a coin. The first few are easy: 2, 3, 5, 7, 11, 13, 17, 19. This is because it’s easy for us to spot a prime number, it cannot be divided by anything but itself and 1. But how do we find more prime numbers? Mostly, we can keep guessing. We try every number we come across and see if it can be divided by anything. There's [no equation](https://en.wikipedia.org/wiki/Prime_number#Formulas_for_primes) that just gives us all the prime numbers unfortunately.

We know there are an [infinite number](https://en.wikipedia.org/wiki/Euclid%27s_theorem) of prime numbers, but as our numbers get bigger, the [prime numbers get rarer](https://en.wikipedia.org/wiki/Prime_number_theorem). It takes more and more effort to guess these numbers. In fact, it takes a lot of [computing power](https://en.wikipedia.org/wiki/Great_Internet_Mersenne_Prime_Search), so we need a lot of people guessing numbers. Since this is guessing takes some time and work, we'll call it _mining_ and people who do it are _miners_.

Let’s say for now that Primecoins are only really big prime numbers (we’re talking thousands, even millions of digits), so big in fact that no one has ever found them before. That means each miner has to spend a lot of time finding them, but as soon as they find one, we can immediately tell that they have found it because we have an [equation](https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test) that tells us whether the number is prime or not.

So Primecoins are _hard to find but easy to verify_. Once I find a Primecoin, I need to immediately tell everyone about it so they know I discovered that Primecoin and so, I own it. To be sure, we want this to be written down somewhere so that everyone can see and no one can pretend to have discovered your Primecoin later. We call this system of recording who owns Primecoins a _Blockchain_.

**What is a Blockchain?**

One of the major advantages of cryptocurrencies is that we only need to write down who owns them. Physical money must be stored in a physical place, so you have to trust a single person and they should be really powerful so no one can steal it, like a bank or government. Cryptocurrencies on the other hand are just numbers, we just need to agree on who owns which one.

Ultimately, our goal is a public, continuously growing ledger which describes what's happening in the currency. Each new update to the ledger we call a _Block_. In each Block is a list of _transactions_. A transaction is an exchange of Primecoins from one person to another. If you read what happens in each block starting from the very first one, you’ll know everything that happened in the currency. We’ll call this ledger, a chain of Blocks, a Blockchain.

The Blockchain is collectively stored by a network of computers. Computers connect to each other in a peer to peer network not too different from how torrents work. Since this technology is not particularly unique to cryptocurrencies we won’t dive into it in more detail. Suffice to say, any computer can join the network at anytime and contribute to the blockchain as much as it wants. Each connected computer we will call a *Node*. *Nodes* have a copy of the entire blockchain and can receive transactions and record them. Your computer which stores your Primecoin is called a _Wallet_.

In order to send a Primecoin, you just have to send a transaction from your Wallet to one Node, that Node will be responsible for updating the rest of the Blockchain on your transaction.

But how does this work, how do we make sure that all of the Nodes agree on what’s in a record? We call this consensus.

**What is consensus and how does it work?**

Every time a Node receives a transaction, it needs to check whether that transaction is valid, i.e. whether the Wallet has as much as money as it says it does. Once the Node has received a certain amount of transactions, it will try and make a Block and then broadcast that Block to the rest of the Nodes.

The algorithm we use to create Blocks is called _Proof of Work_, and it is designed in such a way that that even though all of the Nodes on the Blockchain are trying to create a Block, on average only one Node will be able to create a Block every 10 minutes[2]. Once a Node creates a Block, it will tell all the other Nodes. The other Nodes will then verify that it is a \*\*valid transaction and if so add it to their copy of the Blockchain. Essentially, a Block is hard to make but easy to verify that it is correct. We’ll talk more about Proof of Work in the next section.

But what if there are conflicts? In particular, we’re concerned about _double spending_. If I make two transactions using the same Primecoin, one to my neighbor (transaction A) and one to a friend in China (transaction B), and then send those transactions to Nodes on the opposite sides of the world (Nodes A & B), will I get to spend that Primecoin twice?

To prevent this from happening at the start of each Block is a link to the last correct Block. In this scenario, both Node A and Node B will be competing to create a Block. If Node A creates a Block first, then Transaction A will go through as a valid transaction. Node B will then recognize that I spent my Primecoin and Transaction B is no longer valid, it will not include Transaction B in the next Block it tries to create.

This way, we know that the Blockchain consists only of a chain of valid Blocks, each linking to each other. But how do we make Blocks and why are they hard to make? Further, why would anyone want to make Blocks in the first place? The answer to this is the Proof of Work algorithm.

_[2] This is where the transaction limits on Bitcoin come in, a single Block can contain up to a few thousand transactions and a Block can only be created every 10 minutes. So we get about 10 transactions per second._

**What is Proof of Work?**

You can think of *Proof of Work* as a CAPTCHA for computers. It is a hard but solvable problem that proves that Nodes must solve in order to create a Block. _Proof of Work_ lets us know that Nodes are dedicated to keeping up the Blockchain and not spammers. Further, it means that we require a network of Nodes from across the world, Proof of Work is so hard that no single party could control enough computers to continually solve it.

So this means in our Primecoin currency we have two networks: Miners who are mining Primecoin and Nodes who are recording what is happening to the Primecoins using Blocks. There’s also a key problem for each party, Miners are spending time uselessly guessing numbers in order to create Primecoins and Nodes are trying to create Blocks by solving a hard problem but not being paid for their time. Interestingly, both Blocks and Primecoins are hard to create but easy to verify.

Proof of Work is the genius behind Primecoin (and Bitcoin) that makes it so you get Primecoins from creating Blocks, thus making Miners and Nodes the same thing! The CAPTCHA that Nodes are solving is actually finding a prime number that matches certain conditions, aka mining.

How does this work? Let’s say we have a new Block coming in that we need to record. In Proof of Work, we only mine Primecoins that have information inside of them that _includes the Block._

Imagine instead of a list of transactions, our block just says “hello”. By converting hello into binary code and then converting that binary code into a number, we can turn the word “hello” into a number, specifically: 104101108108111 (try it [here](https://www.browserling.com/tools/text-to-decimal)).

Now we’re going to try find a prime number/PrimeCoin that starts with 104101108108111. Because there are an infinite number of primes we know that such [a number exists](https://math.stackexchange.com/questions/60825/proof-that-there-are-infinitely-many-prime-numbers-starting-with-a-given-digit-s), we just need to find it [2].

For example we’ll guess:

104101108108111**0**

104101108108111**1**

104101108108111**2**

104101108108111**3**

..

104101108108111**11**

104101108108111**12**

And keep going like that. Computers are very fast at guessing so we can guess this millions of time a secod. And eventually, we’ll find a prime number that has the world ‘hello' at the start. We can do this for any message we want, so we can always find a Primecoin that includes our Block.

Now our Primecoin Miners are finally also Nodes! Every time a Node gets a list of new transactions, they will turn them into a Block, find a prime number that includes that Block and broadcast it to all the other Nodes. They will now own a new Primecoin and added a new Block to the Blockchain.

There is now a modification though, a Primecoin is not just a prime number anymore. It’s a prime number that was generated to make a Block. The very first Primecoin is the very first block and we’ll keep generating more with each Block. The more people use Primecoin and the more transactions they generate, the more Primecoins there are.

_[2] This might be unintuitive I linked a formal proof but for an informal understanding, imagine that if you have an infinite number of things that are pretty uniformly distributed, you can find numbers with arbitrary constraints. For example, imagine I want you to find a number that starts with 123456 and is divisible by 32516. We know there are an infinite amount of numbers that are divisible by 32516 and there’s no limit on how big these numbers can get, so we know we can find that a number._

**How do you send a transaction?**

If I have a Primecoin and want to give it to my friend, how do I tell everyone? How do I prove that it’s me giving the Primecoin and not someone pretending to be me? We call a transfer of Primecoins from one owner to another a _transaction_. Now, we need a way for the owner of a transaction to _sign_ it so that we can verify that it’s them.

Note that this is not at all unique to cryptocurrencies, you need to prove who you are on the internet all the time. It’s just that it’s particularly important with cryptocurrencies. If you forget your password on Facebook, Facebook can just reset it for you. If you forget your password in a cryptocurrency, it’s like losing a physical object, it’s gone forever.

Everyone who owns a Primecoin or wants to own has a _wallet_. A wallet consists of two things: a _public key_ that everyone can see, read and copy, and a _private key_ that only you should ever see. If you lose your private key, you lose it forever. Your public and private keys are a pair that you use to prove your identity.

Imagine we want to send a physical piece of paper that contains your transaction. In this case, your private key can be thought of something that creates locks that only your public key can open.

To sign a transaction, you use your private key to create a lock and use it to lock your transaction inside a box. You then send your box to the people who maintain the ledger. In order to prove that it’s you, they take your public key and try and open the box. If it opens, it proves that the lock was created by your private key and the transaction inside is by you. _Only_ your private key can create locks that your public key can open.

After it’s proved that you want to send a transaction, that transaction is queued up to be on the next block and be part of the blockchain.

**What’s this all good for?**

Now we have a set of coins that can be transferred between people, a system for mining new coins and a public, decentralized ledger where everything is written down. My hope is that you think of Primecoins as digital items that we can own and trade without trusting anyone.

But we’ve been calling Primecoin a currency for a while, what makes it a currency and what makes us think people will pay “real" money to own some? The answers to this are in the next section.
