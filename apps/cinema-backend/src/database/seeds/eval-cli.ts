import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '#src/app.module.js';
import { EvalSeeder } from './eval.seed.js';
import { loadFixtures, resetEvalState, takeSnapshot } from './eval-db.js';

// Dùng: tsx database/seeds/eval-cli.ts seed | reset | state
const cmd = process.argv[2] ?? 'seed';
const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});
try {
  const ds = app.get(DataSource);
  if (cmd === 'seed') {
    await new EvalSeeder().run(ds);
  } else if (cmd === 'reset') {
    await resetEvalState(ds, loadFixtures());
    console.log('[EVAL] Đã reset trạng thái giao dịch eval.');
  } else if (cmd === 'state') {
    console.log(
      JSON.stringify(await takeSnapshot(ds, loadFixtures()), null, 2),
    );
  } else {
    throw new Error(`Lệnh không hợp lệ: ${cmd} (seed | reset | state)`);
  }
} catch (e) {
  console.error('[EVAL] Lỗi:', e);
  process.exitCode = 1;
} finally {
  await app.close();
}
