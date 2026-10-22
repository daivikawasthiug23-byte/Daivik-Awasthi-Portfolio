<!--
Reference posts that show the target tone. The pipeline includes these in every generation.
Drafted as starting points: edit them into your own voice, because the blog will imitate them closely.
-->

## Example 1

### Your retry loop is probably making the outage worse

A service starts failing at 2 a.m. Every client notices at the same moment, and every client retries at the same moment. Within seconds the struggling service is getting three times its normal traffic, and a small blip becomes a real outage.

This pattern has a name, the retry storm, and it is one of the easiest ways to turn a partial failure into a full one. Here is how it happens and the two small changes that prevent most of it.

## Why retries multiply load

A retry feels harmless. One request failed, so you send it again. The trouble is scale. If a thousand clients each retry three times, the failing service sees up to four thousand requests instead of one thousand, right when it has the least capacity to handle them.

Fixed delays make it worse. If every client waits exactly one second, they all come back together, and the service gets hit in synchronized waves.

## Add jitter, not just backoff

Exponential backoff spreads retries over time by doubling the wait after each failure. That helps, but clients that started together still stay in step. Jitter fixes that by adding randomness, so each client waits a slightly different time.

```
wait = random(0, base * 2^attempt)
```

The random part is the important part. Without it, backoff just moves the spike later.

## Cap the retries

Set a hard limit, such as three attempts, and stop. A retry budget is even better: allow retries only while they stay under a small share of total traffic, say ten percent. When the budget runs out, fail fast and let the system recover.

## The takeaway

Retries are a load multiplier, so treat them like one. Add jitter to your backoff and put a cap or a budget on attempts. Both changes are a few lines of code and they matter most on the worst day.

---

## Example 2

### Why a faster database query can still make your app slower

A team rewrites a slow query and cuts its time from 400 milliseconds to 40. The dashboard gets faster, and then the overall page gets slower. It sounds wrong, but it happens more often than you would think.

The cause is usually not the query itself. It is what the faster query lets the rest of the system do.

## The bottleneck moves

Every system has one slowest part at any moment. Fix it and the slowest part becomes something else. If the database was holding back a flood of requests, speeding it up releases that flood onto the next layer, which might be a connection pool, a cache or an external API.

## Check the next limit first

Before you ship an optimization, find what sits right after it. Look at the connection pool size, the queue depth and any rate limits on services you call. A quick load test on the new version will show where the pressure lands.

## Measure the whole request

A single query time tells you very little about what users feel. Track the full request, from the first byte in to the last byte out, and compare before and after under realistic load. If the end-to-end number does not improve, the change has not helped yet, no matter how good the query looks on its own.

## The takeaway

Optimize with the whole path in mind. Find the next bottleneck before you remove the current one, and judge the result by the full request, not the single step you changed.
