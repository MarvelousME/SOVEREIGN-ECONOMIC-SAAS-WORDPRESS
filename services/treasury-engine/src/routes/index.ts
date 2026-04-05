import { Router } from 'express';
import { VaultController } from '../controllers/vault.controller';
import { StrategyController } from '../controllers/strategy.controller';
import { TreasuryService } from '../services/treasury.service';
import { OPAService } from '../services/opa.service';
import { EventService } from '../services/event.service';
import { LedgerService } from '../services/ledger.service';
import { pool } from '../config/database';
import { errorHandler } from '../middleware/error-handler';
import { rateLimiter } from '../middleware/rate-limiter';
import { authMiddleware } from '../middleware/auth.middleware';

const opaService = new OPAService();
const eventService = new EventService();
const ledgerService = new LedgerService();
const treasuryService = new TreasuryService(pool, opaService, eventService, ledgerService);

const vaultController = new VaultController(treasuryService);
const strategyController = new StrategyController(treasuryService);

const router = Router();

router.use(authMiddleware);
router.use(rateLimiter);

// Vault routes
router.get('/vaults', vaultController.getAllVaults);
router.post('/vaults', vaultController.createVault);
router.get('/vaults/:id', vaultController.getVault);
router.get('/vaults/:id/performance', vaultController.getPerformance);

// Deposit & Withdrawal
router.post('/deposit', vaultController.deposit);
router.post('/withdraw', vaultController.withdraw);

// Strategy routes
router.get('/strategies', strategyController.getAllStrategies);
router.get('/strategies/:id', strategyController.getStrategy);

// Allocation & Rebalancing
router.post('/allocate', vaultController.allocate);
router.post('/rebalance', vaultController.rebalance);

// Error handler
router.use(errorHandler);

export default router;
