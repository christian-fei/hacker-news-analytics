# hacker news analytics

this small program keeps track of the performance of all hacker news posts until page 10.

live: https://hacker-news-analytics.christianfei.com/

![preview-single](/preview-single.png)
![preview](/preview.png)

## playground

```
npm run play

# or

MONGO_URI=mongodb://localhost:27017/hackernews node playground.js
```

## tests

## fixtures

note: to generate `items.1000.json` run the following command:

````
mongo hackernews --eval 'JSON.stringify(db.items.find({}, {_id: 0, id: 1, title: 1, page: 1, rank: 1, link: 1, score: 1, age: 1, commentCount: 1, updated: 1}).sort({updated: -1}).limit(50000).toArray())' > nlp-data.json```