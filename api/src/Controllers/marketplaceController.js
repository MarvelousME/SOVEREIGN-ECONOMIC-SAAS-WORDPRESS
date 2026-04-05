/**
 * Marketplace apps & installs
 */
const marketplaceModel = require('../Models/marketplace');

function ctx(req) {
    return {
        userId: req.user.userId,
        roles: req.user.roles || [],
    };
}

function canViewApp(app, userId, roles) {
    if (!app) return false;
    if (app.status === 'published') return true;
    if (roles.includes('admin')) return true;
    if (roles.includes('developer') && app.publisher_id === userId) return true;
    return false;
}

function canInstallApp(app, userId, roles) {
    if (!app) return false;
    if (app.status === 'published') return true;
    if (roles.includes('developer') && app.publisher_id === userId) return true;
    return false;
}

class MarketplaceController {
    async listApps(req, res) {
        try {
            const { userId, roles } = ctx(req);
            const page = parseInt(req.query.page, 10) || 1;
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
            const result = await marketplaceModel.listAppsForUser(userId, roles, { page, limit });
            res.json(result);
        } catch (e) {
            console.error('marketplace listApps:', e.message);
            res.status(500).json({ error: 'Failed to list apps' });
        }
    }

    async getApp(req, res) {
        try {
            const { userId, roles } = ctx(req);
            const app = await marketplaceModel.findAppById(req.params.id);
            if (!app || !canViewApp(app, userId, roles)) {
                return res.status(404).json({ error: 'App not found' });
            }
            res.json(app);
        } catch (e) {
            console.error('marketplace getApp:', e.message);
            res.status(500).json({ error: 'Failed to get app' });
        }
    }

    async createApp(req, res) {
        try {
            const { userId, roles } = ctx(req);
            if (!roles.includes('admin') && !roles.includes('developer')) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            const { slug, name, description, category, version, manifest, publisher_id } = req.body;
            if (!slug || !name) {
                return res.status(400).json({ error: 'slug and name are required' });
            }
            let pubId = userId;
            if (roles.includes('admin') && publisher_id != null) {
                pubId = publisher_id;
            }
            const app = await marketplaceModel.createApp({
                slug,
                name,
                description,
                publisher_id: pubId,
                category,
                version,
                manifest,
            });
            res.status(201).json(app);
        } catch (e) {
            if (e.code === '23505') {
                return res.status(409).json({ error: 'Slug already exists' });
            }
            console.error('marketplace createApp:', e.message);
            res.status(500).json({ error: 'Failed to create app' });
        }
    }

    async updateApp(req, res) {
        try {
            const { userId, roles } = ctx(req);
            const app = await marketplaceModel.findAppById(req.params.id);
            if (!app || !marketplaceModel.canManageApp(app, userId, roles)) {
                return res.status(404).json({ error: 'App not found' });
            }
            const updated = await marketplaceModel.updateApp(req.params.id, req.body);
            res.json(updated);
        } catch (e) {
            console.error('marketplace updateApp:', e.message);
            res.status(500).json({ error: 'Failed to update app' });
        }
    }

    async deleteApp(req, res) {
        try {
            const { userId, roles } = ctx(req);
            const app = await marketplaceModel.findAppById(req.params.id);
            if (!app) return res.status(404).json({ error: 'App not found' });

            if (roles.includes('admin')) {
                await marketplaceModel.deleteApp(req.params.id);
                return res.status(204).send();
            }
            if (roles.includes('developer') && app.publisher_id === userId && app.status === 'draft') {
                await marketplaceModel.deleteApp(req.params.id);
                return res.status(204).send();
            }
            return res.status(403).json({ error: 'Only admins or draft owners may delete' });
        } catch (e) {
            console.error('marketplace deleteApp:', e.message);
            res.status(500).json({ error: 'Failed to delete app' });
        }
    }

    async publish(req, res) {
        try {
            const { userId, roles } = ctx(req);
            const app = await marketplaceModel.findAppById(req.params.id);
            if (!app || !marketplaceModel.canManageApp(app, userId, roles)) {
                return res.status(404).json({ error: 'App not found' });
            }
            const updated = await marketplaceModel.setAppStatus(req.params.id, 'published');
            res.json(updated);
        } catch (e) {
            console.error('marketplace publish:', e.message);
            res.status(500).json({ error: 'Failed to publish' });
        }
    }

    async archive(req, res) {
        try {
            const { userId, roles } = ctx(req);
            const app = await marketplaceModel.findAppById(req.params.id);
            if (!app || !marketplaceModel.canManageApp(app, userId, roles)) {
                return res.status(404).json({ error: 'App not found' });
            }
            const updated = await marketplaceModel.setAppStatus(req.params.id, 'archived');
            res.json(updated);
        } catch (e) {
            console.error('marketplace archive:', e.message);
            res.status(500).json({ error: 'Failed to archive' });
        }
    }

    async install(req, res) {
        try {
            const { userId, roles } = ctx(req);
            const app = await marketplaceModel.findAppById(req.params.id);
            if (!app || !canViewApp(app, userId, roles)) {
                return res.status(404).json({ error: 'App not found' });
            }
            if (!canInstallApp(app, userId, roles)) {
                return res.status(400).json({ error: 'App is not available for install' });
            }
            const row = await marketplaceModel.installApp(userId, app.id);
            res.json(row);
        } catch (e) {
            console.error('marketplace install:', e.message);
            res.status(500).json({ error: 'Failed to install' });
        }
    }

    async listInstalls(req, res) {
        try {
            const { userId } = ctx(req);
            const rows = await marketplaceModel.listInstalls(userId);
            res.json({ data: rows });
        } catch (e) {
            console.error('marketplace listInstalls:', e.message);
            res.status(500).json({ error: 'Failed to list installs' });
        }
    }

    async activateInstall(req, res) {
        try {
            const { userId } = ctx(req);
            const install = await marketplaceModel.findInstall(req.params.installId, userId);
            if (!install) return res.status(404).json({ error: 'Install not found' });
            if (install.status === 'disabled' || install.status === 'installed') {
                const row = await marketplaceModel.setInstallStatus(install.id, userId, 'active');
                return res.json(row);
            }
            return res.json(install);
        } catch (e) {
            console.error('marketplace activateInstall:', e.message);
            res.status(500).json({ error: 'Failed to activate' });
        }
    }

    async deactivateInstall(req, res) {
        try {
            const { userId } = ctx(req);
            const install = await marketplaceModel.findInstall(req.params.installId, userId);
            if (!install) return res.status(404).json({ error: 'Install not found' });
            const row = await marketplaceModel.setInstallStatus(install.id, userId, 'disabled');
            res.json(row);
        } catch (e) {
            console.error('marketplace deactivateInstall:', e.message);
            res.status(500).json({ error: 'Failed to deactivate' });
        }
    }

    async uninstall(req, res) {
        try {
            const { userId } = ctx(req);
            const install = await marketplaceModel.findInstall(req.params.installId, userId);
            if (!install) return res.status(404).json({ error: 'Install not found' });
            await marketplaceModel.uninstallApp(userId, install.app_id);
            res.status(204).send();
        } catch (e) {
            console.error('marketplace uninstall:', e.message);
            res.status(500).json({ error: 'Failed to uninstall' });
        }
    }
}

module.exports = new MarketplaceController();
