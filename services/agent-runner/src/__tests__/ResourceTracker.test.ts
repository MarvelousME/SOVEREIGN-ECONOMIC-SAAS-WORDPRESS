import { ResourceTracker } from '../executors/AgentRuntime';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

describe('ResourceTracker', () => {
  let resourceTracker: ResourceTracker;

  beforeEach(() => {
    jest.clearAllMocks();
    resourceTracker = new ResourceTracker();
  });

  describe('getSnapshot', () => {
    it('should return a resource snapshot with all fields', () => {
      const snapshot = resourceTracker.getSnapshot();

      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('cpuUsagePercent');
      expect(snapshot).toHaveProperty('memoryUsedMB');
      expect(snapshot).toHaveProperty('memoryTotalMB');
      expect(snapshot).toHaveProperty('storageUsedMB');
    });

    it('should calculate CPU usage correctly', () => {
      const snapshot = resourceTracker.getSnapshot();
      expect(typeof snapshot.cpuUsagePercent).toBe('number');
      expect(snapshot.cpuUsagePercent).toBeGreaterThanOrEqual(0);
      expect(snapshot.cpuUsagePercent).toBeLessThanOrEqual(100);
    });

    it('should calculate memory usage correctly', () => {
      const snapshot = resourceTracker.getSnapshot();

      expect(snapshot.memoryUsedMB).toBeGreaterThan(0);
      expect(snapshot.memoryTotalMB).toBeGreaterThan(0);
      expect(snapshot.memoryUsedMB).toBeLessThanOrEqual(snapshot.memoryTotalMB);
    });

    it('should call os.cpus to get CPU info', () => {
      resourceTracker.getSnapshot();
      expect(os.cpus).toHaveBeenCalled();
    });

    it('should call os.totalmem and os.freemem', () => {
      resourceTracker.getSnapshot();
      expect(os.totalmem).toHaveBeenCalled();
      expect(os.freemem).toHaveBeenCalled();
    });
  });

  describe('getStorageUsage', () => {
    it('should return 0 when path does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      const usage = await resourceTracker.getStorageUsage('agent-123', 'exec-456');
      expect(usage).toBe(0);
    });

    it('should return storage size when path exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readdirSync as jest.Mock).mockReturnValueOnce([
        { isDirectory: () => false, name: 'file.txt' }
      ]);
      (fs.statSync as jest.Mock).mockReturnValueOnce({ size: 2048 });

      const usage = await resourceTracker.getStorageUsage('agent-123', 'exec-456');
      expect(usage).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const usage = await resourceTracker.getStorageUsage('agent-123');
      expect(usage).toBe(0);
    });
  });
});
