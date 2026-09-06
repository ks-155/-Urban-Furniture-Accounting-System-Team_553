const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

router.use(authenticateToken);

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', authorizeRoles('ADMIN', 'ACCOUNTANT'), productController.createProduct);
router.put('/:id', authorizeRoles('ADMIN', 'ACCOUNTANT'), productController.updateProduct);
router.delete('/:id', authorizeRoles('ADMIN'), productController.deleteProduct);

module.exports = router;
