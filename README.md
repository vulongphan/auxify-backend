1. Trong này t dùng client secret và client id của t nhé

2. MongoDB database của mình đc host ở mongodb://3.131.26.14:27017/auxifyDB, để truy cập c lên command prompt run 'mongo 3.131.26.14/auxifyDB' rồi lại run command 'db.rooms.find()' sẽ thấy các rooms của mình nhé. Ban đầu locally thì truy cập địa chỉ database của mình là mongo 127.0.0.1:27017/auxifyDB
3. Để thay đổi expire time của collection rooms của mình, thì mình truy cập vào db của mình (mongo 127.0.0.1:27017/auxifyDB) trên và sau đó gõ command này db.runCommand( { "collMod":"rooms", "index": { "name": "createdAt_1", "expireAfterSeconds": 10, } } ). Cái value của field "expireAfterSeconds" là tuỳ mình set nhé
4. To view all the indexes of a collection, run db.rooms.getIndexes()
to delete all documents, run db.rooms.remove({})
For your reference cách t deploy local mongodb lên world wide web: https://www.youtube.com/watch?v=Ir68GVsNWB4

5. Để thay đổi expire time của collection rooms của mình, thì mình truy cập vào db của mình như trên và sau đó gõ command này 
db.runCommand( { "collMod":"rooms", "index": { "name": "createdAt_1", "expireAfterSeconds": 14400, } } ). Cái value của field "expireAfterSeconds" là tuỳ mình set nhé

6. To set the expire time for the collection if the index is not yet there, run this command `db.rooms.ensureIndex( { "createdAt": 1 }, { expireAfterSeconds: 14400 } )`


[mongodb-org-3.4]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2013.03/mongodb-org/3.4/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-3.4.asc