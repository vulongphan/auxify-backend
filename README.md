1. Trong này t dùng client secret và client id của t nhé

2. MongoDB database của mình đc host ở mongodb://3.128.218.1:27017/auxifyDB, để truy cập c lên command prompt run 'mongo 3.128.218.1/auxifyDB' rồi lại run command 'db.rooms.find()' sẽ thấy các rooms của mình nhé. Ban đầu locally thì địa chỉ database của mình là mongodb://127.0.0.1:27017/auxifyDB.
3. Để thay đổi expire time của collection rooms của mình, thì mình truy cập vào db của mình (mongo 127.0.0.1:27017/auxifyDB) trên và sau đó gõ command này db.runCommand( { "collMod":"rooms", "index": { "name": "createdAt_1", "expireAfterSeconds": 10, } } ). Cái value của field "expireAfterSeconds" là tuỳ mình set nhé
4. To view all the indexes of a collection, run db.rooms.getIndexes()
to delete all documents, run db.rooms.remove({})
For your reference cách t deploy local mongodb lên world wide web: https://www.youtube.com/watch?v=Ir68GVsNWB4

5. Để thay đổi expire time của collection rooms của mình, thì mình truy cập vào db của mình như trên và sau đó gõ command này 
db.runCommand( { "collMod":"rooms", "index": { "name": "createdAt_1", "expireAfterSeconds": 14400, } } ). Cái value của field "expireAfterSeconds" là tuỳ mình set nhé

6. To set the expire time for the collection if the index is not yet there, run this command `db.rooms.ensureIndex( { "createdAt": 1 }, { expireAfterSeconds: 14400 } )`


