interface convertLandTitlesToLandAreaProps {
  titles: any;
}
export function convertLandTitlesToLandArea({ titles }: convertLandTitlesToLandAreaProps) {
  const totalSquareWa = (titles ?? []).reduce((prev, curr) => {
    const areaRai = curr.rai ?? 0;
    const areaNgan = curr.ngan ?? 0;
    const areaWa = curr.squareWa ?? 0;
    return prev + areaRai * 400 + areaNgan * 100 + areaWa;
  }, 0);
  console.log('titles', titles, 'totalSqWa', totalSquareWa);
  return totalSquareWa;
}
