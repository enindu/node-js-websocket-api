import bcrypt from "bcrypt"
import bookshelf from "bookshelf"
import io from "socket.io"
import knex from "knex"
import moment from "moment"
import uniqid from "uniqid"
import validator from "validatorjs"

const connection = knex({
  client: 'mysql',
  connection: {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'websocket_api',
    charset: 'utf8'
  }
});

const database = bookshelf(connection);
const websocket = io(3000)

const account = database.model('account', {
  tableName: 'accounts',
  hasTimestamps: true
})

websocket.on('connection', (socket) => {
  console.log('[INFO][%s] User connected to WebSocket', moment().format())

  // api.accounts.register
  socket.on('api.accounts.register', (data) => {
    let validation = new validator(data, {
      email: 'required|email|max:191',
      password: 'required|min:6|max:32',
      confirmPassword: 'required|same:password'
    })

    if(validation.fails()) {
      console.log('[ERR][%s] Parameters are invalid', moment().format())
      socket.emit('api.accounts.register', {
        status: false,
        message: 'Parameters are invalid'
      })

      return
    }

    new account().where('email', data.email).fetch({
      require: false
    }).then((queryResults) => {
      if(queryResults !== null) {
        throw new Error('There is an account already using that email')
      }

      bcrypt.hash(data.password, 10).then((hashedPassword) => {
        new account({
          unique_id: uniqid(),
          email: data.email,
          password: hashedPassword
        }).save().then(() => {
          console.log('[INFO][%s] %s', moment().format(), 'Account created successfully')
          socket.emit('api.accounts.register', {
            status: true,
            message: 'Account created successfully'
          })
        })
      })
    }).catch((error) => {
      console.log('[ERR][%s] %s', moment().format(), error.message)
      socket.emit('api.accounts.register', {
        status: false,
        message: error.message
      })
    })
  })

  // api.accounts.login
  socket.on('api.accounts.login', (data) => {
    let validation = new validator(data, {
      email: 'required|email|max:191',
      password: 'required|min:6|max:32'
    })

    if(validation.fails()) {
      console.log('[ERR][%s] Parameters are invalid', moment().format())
      socket.emit('api.accounts.login', {
        status: false,
        message: 'Parameters are invalid'
      })

      return
    }

    new account().where('email', data.email).fetch({
      require: false
    }).then((queryResults) => {
      if(queryResults === null) {
        throw new Error('There is no account found using that email')
      }

      bcrypt.compare(data.password, queryResults.get('password')).then((passwordCheck) => {
        if(!passwordCheck) {
          throw new Error('Email or password is invalid')
        }

        console.log('[INFO][%s] %s', moment().format(), 'Logged in successfully')
        socket.emit('api.accounts.login', {
          status: true,
          message: 'Logged in successfully',
          parameters: {
            uniqueID: queryResults.get('unique_id')
          }
        })
      })
    }).catch((error) => {
      console.log('[ERR][%s] %s', moment().format(), error.message)
      socket.emit('api.accounts.login', {
        status: false,
        message: error.message
      })
    })
  })

  socket.on('disconnect', () => {
    console.log('[INFO][%s] User disconnected from WebSocket', moment().format());
  });
})
