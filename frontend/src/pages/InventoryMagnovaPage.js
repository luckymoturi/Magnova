import React from 'react';
import { InventoryPage } from './InventoryPage';

export const InventoryMagnovaPage = () => {
  return (
    <InventoryPage
      organization="Magnova"
      inventoryLabel="Inventory - Magnova"
      showInward={false}
      showOutward={true}
      outwardScope="all"
      warehouseLabel="Ware House"
      preferredLocations={[
        'Magnova - Vijayawada',
        'Magnova - Hyderabad',
        'Magnova - Chennai',
        'Magnova - Bengaluru',
      ]}
    />
  );
};
