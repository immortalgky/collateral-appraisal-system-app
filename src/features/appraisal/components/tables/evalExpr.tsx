export type BinaryOp = 'add' | 'sub' | 'mul' | 'div';

export type Expr =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: string }
  | { type: 'binary'; op: BinaryOp; left: Expr; right: Expr }
  | { type: 'rowRef'; rowIndex: number; field: RowFieldName };

export type Env = Record<string, number>;

export type LookupRow = (rowIndex: number, field: string) => number;

export function evalExpr(expr: Expr, env: Env, lookupRow: LookupRow): number {
  switch (expr.type) {
    case 'number':
      return expr.value;
    case 'variable': {
      const value = env[expr.name];
      if (value === undefined) {
        throw new Error(`Unknown variable: ${expr.name}`);
      }
      return value;
    }
    case 'rowRef':
      return lookupRow(expr.rowIndex, expr.field);
    case 'binary': {
      switch (expr.op) {
        case 'add':
          return evalExpr(expr.left, env, lookupRow) + evalExpr(expr.right, env, lookupRow);
        case 'sub':
          return evalExpr(expr.left, env, lookupRow) - evalExpr(expr.right, env, lookupRow);
        case 'div':
          return evalExpr(expr.left, env, lookupRow) / evalExpr(expr.right, env, lookupRow);
        case 'mul':
          return evalExpr(expr.left, env, lookupRow) * evalExpr(expr.right, env, lookupRow);
      }
    }
  }
}

export function formatExpr(expr: Expr): string {
  switch (expr.type) {
    case 'number':
      return expr.value.toString();
    case 'variable':
      return expr.name;
    case 'rowRef':
      return `row[${expr.rowIndex}].${expr.field}`;
    case 'binary':
      return `(${formatExpr(expr.left)} ${opToSymbol(expr.op)} ${formatExpr(expr.right)})`;
  }
}

function opToSymbol(op: BinaryOp): string {
  switch (op) {
    case 'add':
      return '+';
    case 'sub':
      return '-';
    case 'mul':
      return '*';
    case 'div':
      return '/';
  }
}
