export const AdjustFinalValueSection = () => {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="grid grid-cols-12">
        <div className="col-span-3">Coefficient of decision</div>
        <div className="col-span-9"></div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Include area</div>
        <div className="col-span-9"></div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Area</div>
        <div className="col-span-9"></div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">Appraisal Price</div>
        <div className="col-span-9"></div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">{'Appraisal Price (rounded)'}</div>
        <div className="col-span-9"></div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-3">{'Include building cost'}</div>
        <div className="col-span-9"></div>
      </div>
    </div>
  );
};
