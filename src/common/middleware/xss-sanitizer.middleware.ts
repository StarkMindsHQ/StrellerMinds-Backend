import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

const xssOptions: xss.IFilterXSSOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return xss(value, xssOptions);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)]),
    );
  }

  return value;
};

export function xssSanitizerMiddleware(req: Request, _res: Response, next: NextFunction) {
  (req as any).body = sanitizeValue(req.body);
  (req as any).query = sanitizeValue(req.query);
  (req as any).params = sanitizeValue(req.params);
  next();
}
