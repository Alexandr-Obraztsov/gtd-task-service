const path = require('node:path');
const { Router } = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const validate = require('../middleware/validate');

const openApiSpec = require(path.resolve(__dirname, '../../docs/openapi.json'));

const DOCS_SECURITY_HEADERS = Object.freeze({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  frameguard: { action: 'deny' },
});

const SWAGGER_UI_OPTIONS = Object.freeze({
  customSiteTitle: 'GTD Task Service API',
  swaggerOptions: { persistAuthorization: false, withCredentials: true },
});

const router = Router();

router.use(helmet(DOCS_SECURITY_HEADERS));
router.get('/openapi.json', validate(), (req, res) => {
  res.status(200).json(openApiSpec);
});
router.use('/', swaggerUi.serve);
router.get('/', validate(), swaggerUi.setup(openApiSpec, SWAGGER_UI_OPTIONS));

module.exports = router;
