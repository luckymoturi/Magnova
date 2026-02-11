import React from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { XCircle } from 'lucide-react';

export const POLineItemRow = ({ item, index, onUpdate, onRemove, canRemove }) => {
  const calculatePOValue = (qty, rate) => {
    return ((parseFloat(qty) || 0) * (parseFloat(rate) || 0)).toFixed(2);
  };

  return (
    <tr className="border-t border-neutral-100">
      <td className="px-2 py-2 text-neutral-900">{index + 1}</td>
      <td className="px-2 py-2">
        <Input
          value={item.vendor}
          onChange={(e) => onUpdate(index, 'vendor', e.target.value)}
          placeholder="Vendor"
          className="h-8 text-xs bg-white text-neutral-900"
          required
        />
      </td>
      <td className="px-2 py-2">
        <Input
          value={item.location}
          onChange={(e) => onUpdate(index, 'location', e.target.value)}
          placeholder="Location"
          className="h-8 text-xs bg-white text-neutral-900"
          required
        />
      </td>
      <td className="px-2 py-2">
        <Input
          value={item.brand}
          onChange={(e) => onUpdate(index, 'brand', e.target.value)}
          placeholder="Brand"
          className="h-8 text-xs bg-white text-neutral-900"
          required
        />
      </td>
      <td className="px-2 py-2">
        <Input
          value={item.model}
          onChange={(e) => onUpdate(index, 'model', e.target.value)}
          placeholder="Model"
          className="h-8 text-xs bg-white text-neutral-900"
          required
        />
      </td>
      <td className="px-2 py-2">
        <Input
          value={item.storage}
          onChange={(e) => onUpdate(index, 'storage', e.target.value)}
          placeholder="Storage"
          className="h-8 text-xs bg-white text-neutral-900"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          value={item.qty}
          onChange={(e) => onUpdate(index, 'qty', e.target.value)}
          placeholder="Qty"
          className="h-8 text-xs bg-white text-neutral-900 w-16"
          min="1"
          required
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          value={item.rate}
          onChange={(e) => onUpdate(index, 'rate', e.target.value)}
          placeholder="Rate"
          className="h-8 text-xs bg-white text-neutral-900"
          step="0.01"
          required
        />
      </td>
      <td className="px-2 py-2 text-neutral-900 font-medium">
        ₹{calculatePOValue(item.qty, item.rate)}
      </td>
      <td className="px-2 py-2">
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-8 w-8 p-0 text-neutral-800 hover:text-neutral-900 hover:bg-neutral-100"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        )}
      </td>
    </tr>
  );
};
