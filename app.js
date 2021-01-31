const secrets = require('./secrets')
process.env.GITHUB_CLIENT_ID = secrets.GITHUB_CLIENT_ID;
process.env.GITHUB_CLIENT_SECRET = secrets.GITHUB_CLIENT_SECRET

const axios = require('axios')
const jwt = require('jsonwebtoken')
const express = require('express');
const app = express();

app.use(express.json());
app.engine('html', require('ejs').renderFile);

const { models: { User }} = require('./db');
const path = require('path');

app.get('/', (req, res)=> res.render(path.join(__dirname, 'index.html'), { GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID }));

app.get('/api/auth', async(req, res, next)=> {
  try {
    res.send(await User.byToken(req.headers.authorization));
  }
  catch(ex){
    next(ex);
  }
});

app.get('/github/callback', async(req, res, next)=> {
  try {
    const tokenObject = await User.authenticate(req.query.code)
    const token = tokenObject.access_token;
    const response = await axios.get('https://api.github.com/user',{
        headers:{
            authorization: `token ${token}`
        }
    })
    const {login,id} = response.data
    let user = await User.findOne({
        where: {
            username:login,
            githubId:id
        }
    })
    if(!user){
        user = await User.create({username:login,githubId:id})
    }
    const jwtToken = jwt.sign({id:user.id},process.env.JWT)
    console.log(jwtToken)
    res.send(`
      <html>
       <body>
       <script>
        window.localStorage.setItem('token', '${jwtToken}');
        window.document.location = '/';
       </script>
        </body>
      </html>
    `);

    
  }
  catch(ex){
    next(ex);
  }
});

app.use((err, req, res, next)=> {
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
