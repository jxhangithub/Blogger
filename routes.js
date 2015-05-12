let multiparty = require('multiparty')
let fs = require('fs')
let DataUri = require('datauri')
let then = require('express-then')
let isLoggedIn = require('./middleware/isLoggedIn')
let Post = require('./models/post')
let Comment = require('./models/comment')
let util = require('util')

module.exports = (app) => {
  let passport = app.passport

  app.get('/', (req, res) => {
    res.render('index.ejs')
  })
  app.get('/login', (req, res) => {
    res.render('login.ejs', {message: req.flash('error')})
  })

  app.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  }))

  app.get('/signup', (req, res) => {
    res.render('signup.ejs', {message: req.flash('error')})
  })
  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/signup',
    failureFlash: true
  }))

  app.get('/profile', isLoggedIn, then( async(req, res) => {
    let posts = await Post.promise.find({username: req.user.username})
    // posts.forEach(function(post){
    //   console.log('Title: ' + post.title)
    //   console.log('Title: ' + post.createdAt)
    //   console.log('Title: ' + post.updatedAt)
    // })
    let comments = await Comment.promise.find({postAuthor: req.user.username})
    res.render('profile.ejs', {
      posts: posts,
      user: req.user,
      comments: comments,
      message: req.flash('error')
    })
  }))

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.get('/post/:postId?', isLoggedIn, then( async(req, res) => {
    let postId = req.params.postId
    if (!postId) {
      res.render('post.ejs', {
        post: {},
        verb: 'Create'
      })
      return
    }

    let post = await Post.promise.findById(postId)
    if (!post) res.send(404, 'Not found')
    let datauri = new DataUri()
    let image = datauri.format('.'+post.image.contentType.split('/').pop(), post.image.data)
    res.render('post.ejs', {
      post: post,
      verb: 'Edit',
      image: `data:${post.image.contentType};base64,${image.base64}`
    })
  }))


  app.post('/post/:postId?', isLoggedIn, then(async (req, res) => {
    let userReq = req
    let postId = req.params.postId
    // console.log('User: ' + userReq)
    if (!postId) {
      let post = new Post()
      let [{title: [title], content: [content]}, {image: [file]}] = await new multiparty.Form().promise.parse(userReq)
      // console.log('After multiparty')

      post.title = title
      post.content = content
      post.image.data = await fs.promise.readFile(file.path)
      post.image.contentType = file.headers['content-type']
      post.username = req.user.username
      await post.save()
      // console.log('req: ' + req.user)
      res.redirect('/profile')
      // res.redirect('/blog/' + encodeURI(req.user.blogTitle))
      // res.redirect('/post')
      return
    }

    let post = await Post.promise.findById(postId)
    // console.log('Post: ' + post)
    if (!post) res.send(404, 'Not found')
    let [{title: [title], content: [content]}, {image: [file]}] = await new multiparty.Form().promise.parse(userReq)
    post.title = title
    post.content = content
    post.username = req.user.username
    // console.log('File: ' +util.inspect(file))
    if (file.originalFilename) {
      // console.log('Read file' + file.originalFilename)
      post.image.data = await fs.promise.readFile(file.path)
      post.image.contentType = file.headers['content-type']
    }
    await post.save()
    // console.log(' User Req: ' + req.user)
    res.redirect('/profile')
    // res.redirect('/blog/' + encodeURI(req.user.blogTitle))
    return
  }))

  app.get('/delete/:postId?', isLoggedIn, then(async (req, res) => {
    let postId = req.params.postId
    console.log('postId: ' + postId)
    if (!postId) {
      res.redirect('/profile')
      return
    }
    let post = await Post.promise.findById(postId)
    if (!post) res.send(404, 'Not found')
    await post.remove()
    res.redirect('/profile')
    return
  }))

  app.get('/blog/:blogId?', isLoggedIn, then( async(req, res) => {
    let blogId = req.params.blogId
    console.log('blogId: ' + blogId)
    if (!blogId) {
      res.redirect('/profile')
      return
    }

    let posts = await Post.promise.find({username: blogId})
    if (!posts) res.send(404, 'Not found')
    let posts2 = []
    for (let post of posts) {
        let datauri = new DataUri()
        let image = datauri.format('.'+post.image.contentType.split('/').pop(), post.image.data)
        let comments = await Comment.promise.find({postId: post._id})
        let post2 = {
          title: post.title,
          content: post.content,
          image: `data:${post.image.contentType};base64,${image.base64}`,
          updatedAt: post.updatedAt,
          _id: post._id,
          comments: comments
        }
        posts2.push(post2)
    }
    // let datauri = new DataUri()
    // let image = datauri.format('.'+post.image.contentType.split('/').pop(), post.image.data)
    res.render('blog.ejs', {
      user: req.user,
      posts: posts2,
      blogAuthor: blogId
      // ,
      // verb: 'Edit',
      // image: `data:${post.image.contentType};base64,${image.base64}`
    })
  }))



  app.get('/comment/:postId?', isLoggedIn, then( async(req, res) => {
      let postId = req.params.postId
      res.render('comment.ejs', {
        comment: {},
        verb: 'Create',
        postId: postId
      })
      return
  }))


  app.post('/comment/:postId?', isLoggedIn, then(async (req, res) => {
      let postId = req.params.postId
      let comment = new Comment()
      // console.log(util.inspect(req))
      // let [{content: [content]}] = await new multiparty.Form().promise.parse(userReq)
      // console.log('After multiparty')
      let post = await Post.promise.findById(postId)
      if (!post) res.send(404, 'Not found')
      console.log("Post Found")
      comment.username = req.user.username
      console.log("User Found")
      comment.content = req.body.content
      console.log("content Found" + req.body.content)
      comment.postId = postId
      console.log("PostId Found")
      comment.postAuthor = post.username
      console.log("PostAuthor Found")
      await comment.save()
      console.log("save Found")
      // console.log('req: ' + req.user)
      res.redirect('/profile')
      // res.redirect('/blog/' + encodeURI(req.user.blogTitle))
      // res.redirect('/post')
      return
  }))


}
