interface DiscountedCashFlowAssumptionProps {
  assumption: { type: string };
}

export function DiscountedCashFlowAssumption({ assumption }: DiscountedCashFlowAssumptionProps) {
  switch (assumption.type) {
    case '':
      return <></>;
  }
}
