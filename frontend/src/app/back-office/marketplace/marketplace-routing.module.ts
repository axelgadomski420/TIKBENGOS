import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MarketplaceComponent } from './marketplace.component';
import { ProductManagementComponent } from './product-management/product-management.component';
import { OrdersComponent } from './orders/orders.component';
import { ReclamationsComponent } from './reclamations/reclamations.component';
import { InventoryForecastComponent } from './inventory-forecast/inventory-forecast.component';

const routes: Routes = [
  { path: '', component: MarketplaceComponent, pathMatch: 'full' },
  { path: 'products', component: ProductManagementComponent },
  { path: 'orders', component: OrdersComponent },
  { path: 'reclamations', component: ReclamationsComponent },
  { path: 'forecast', component: InventoryForecastComponent },
  { path: 'products/:id', redirectTo: 'products', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MarketplaceRoutingModule {}
