
const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nivp9.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


 function verifyJWT(req,res,next){
    const authHeader  = req.headers.authorization 
    if(!authHeader){
      return res.status(401).send({message:'Unauthrized access'})
    }
    const token = authHeader.split(' ')[1]

    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded) {
      if(err){
        return res.status(403).send({message:'Forbiden access'})
      }
     req.decoded = decoded
     next()
    });
}

async function run() {

    try {
      await client.connect()
      const serviceCollection = client.db("finalproject").collection("services")
      const bookingCollection = client.db("finalproject").collection("booking")
      const userCollection = client.db("finalproject").collection("user")
      console.log('db connected')

       app.get('/service', async(req,res)=>{
           const query = {}
           const cursor = serviceCollection.find(query)
           const services =await cursor.toArray()
           res.send(services)
       })
  

        app.get('/booking',verifyJWT, async(req,res)=>{
          const patient = req.query.patient
          const decodedEmail = req.decoded.email 
          if(patient=== decodedEmail){
            const query = {patient:patient}
          const bookings = await bookingCollection.find(query).toArray()
            return res.send(bookings)
          }
          else{
            return res.status(403).send({message:'Forbiden access'})
          }
        
        })

         app.get('/user' ,verifyJWT, async(req,res)=>{
           const users = await userCollection.find().toArray()
           res.send(users)
         })


         app.get('/admin/:email',async(req,res)=>{
           const email = req.params.email 
           const user = await userCollection.findOne({email:email}) 
           const isAdmin = user.role === 'admin'
          res.send({admin:isAdmin})
         })

         app.put('/user/admin/:email',verifyJWT, async(req,res)=>{
          const email = req.params.email
          const requester = req.decoded.email
          const requesterAccount= await userCollection.findOne({email:requester})
          if(requesterAccount.role === 'admin'){
            const filter = {email:email}
            const updateDoc = {
  
              $set: {role:'admin'}
            };
            const result= await userCollection.updateOne(filter, updateDoc)
            res.send(result)
          }
          else{
           res.status(403).send({message:'Forbiden access'})
          }
         
      })


        app.put('/user/:email', async(req,res)=>{
            const email = req.params.email
            const user = req.body
            const filter = {email:email}
            const options = { upsert: true };
            const updateDoc = {

              $set: user
            };
            const result= await userCollection.updateOne(filter, updateDoc,options)
            const token = jwt.sign({email:email}, process.env.ACCESS_TOKEN , { expiresIn: '1h' })
            res.send({result, token})
        })

        app.get('/available', async(req, res) =>{
          const selectedDate = req.query.selectedDate;
          // step 1:  get all services
          const services = await serviceCollection.find().toArray();
    
          // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
          const query = {selectedDate: selectedDate};
          const bookings = await bookingCollection.find(query).toArray();
            // console.log(selectedDate);
          // step 3: for each service
          services.forEach(service=>{
            const serviceBookings = bookings.filter(book => book.treatment === service.name);
            const bookedSlots = serviceBookings.map(book => book.slot);
            const available = service.slots.filter(slot => !bookedSlots.includes(slot));
            service.slots = available;
          });
         
          
          res.send(services);
        })
       
       //create a new user
       app.post('/booking', async(req,res)=>{
         const booking = req.body 
         const query = { treatment: booking.treatment , selectedDate: booking.selectedDate , patient:booking.patient}
          const exists = await bookingCollection.findOne(query)
          if(exists){
            return res.send({success: false , booking:exists})
          }
         const result = await bookingCollection.insertOne(booking) 
         res.send({success:true ,result})
       })


    } 
    finally {

    }
  
  }
  
  run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('Hello from docter')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
