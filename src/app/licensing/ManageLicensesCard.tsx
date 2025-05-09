'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useOrganization } from '@clerk/nextjs';
import { Label } from '@radix-ui/react-label';
import React, { useState } from 'react';
import { getPortalUrl, getCheckoutUrl } from './actions';
import { ImSpinner } from 'react-icons/im';

type Props = {
  licensedUsersCount: number;
  purchasedLicensesCount: number;
};

const ManageLicensesCard = ({ licensedUsersCount, purchasedLicensesCount }: Props) => {
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [licenseQuantity, setLicenseQuantity] = useState(1);
  const [isAddingLicenses, setIsAddingLicenses] = useState(false);

  async function onManageSubscriptionClicked() {
    try {
      setIsLoading(true);
      const url = await getPortalUrl(organization?.id as string);
      window.location.href = url as string;
    } catch (error) {
      console.error('Failed to get portal URL:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function onAddLicensesClicked() {
    if (!organization) {
      console.error('Organization not found');
      return;
    }

    try {
      setIsAddingLicenses(true);
      // Use purchasedLicensesCount from props, adding the new quantity
      const newTotalLicenses = purchasedLicensesCount + licenseQuantity;
      const url = await getCheckoutUrl(organization.id, newTotalLicenses);
      window.location.href = url as string;
    } catch (error) {
      console.error('Failed to get checkout URL:', error);
    } finally {
      setIsAddingLicenses(false);
    }
  }

  return (
    <Card className="min-w-[350px] w-full">
      <CardHeader>
        <CardTitle>
          {organization?.name} is using {licensedUsersCount} of {purchasedLicensesCount} available seats.
        </CardTitle>
        <CardDescription>
          Add more licenses to your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="quantity">Number of licenses to add</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={1000}
              value={licenseQuantity}
              onChange={(e) => setLicenseQuantity(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex space-x-2">
        <Button 
          onClick={onManageSubscriptionClicked}
          disabled={isLoading || isAddingLicenses}
        >
          {isLoading ? <ImSpinner className="animate-spin mr-2" /> : null}
          Manage subscription
        </Button>
        <Button 
          onClick={onAddLicensesClicked}
          disabled={isLoading || isAddingLicenses}
          variant="secondary"
        >
          {isAddingLicenses ? <ImSpinner className="animate-spin mr-2" /> : null}
          Add {licenseQuantity} license{licenseQuantity > 1 ? 's' : ''}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ManageLicensesCard;