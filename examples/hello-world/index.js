var express = require('../../');

var app = express();

var subApp = express();
var router = express.Router();

router.post('/test1', function(req, res) {
  res.json({
    code: 200,
    message: 'test'
  })
});

subApp.use(router);

app.use(function(req, res, next) {
  next();
})

app.use('/user', subApp);

app.get('/hello/world', function(req, res){
  res.json({
    code: 100,
    message: 'Hello World'
  });
});

/* istanbul ignore next */
if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}
