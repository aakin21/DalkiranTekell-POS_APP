import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class AppController {
  @Get()
  root(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'public', 'index.html'));
  }

  @Get('*')
  spa(@Res() res: Response) {
    const path = res.req.path;
    // API routes should not be redirected
    if (path.startsWith('/auth') || path.startsWith('/users') || path.startsWith('/stores') ||
        path.startsWith('/categories') || path.startsWith('/products') || path.startsWith('/sales') ||
        path.startsWith('/shifts') || path.startsWith('/devices') || path.startsWith('/stocks') ||
        path.startsWith('/refunds') || path.startsWith('/reports') || path.startsWith('/sync') ||
        path.startsWith('/audit-logs')) {
      return;
    }
    res.sendFile(join(process.cwd(), 'public', 'index.html'));
  }
}
