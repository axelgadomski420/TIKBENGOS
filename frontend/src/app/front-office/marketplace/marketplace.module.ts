import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { MarketplaceComponent } from './marketplace.component';
import { MarketplaceRoutingModule } from './marketplace-routing.module';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductDetailsComponent } from './product-details/product-details.component';
import { CartComponent } from './cart/cart.component';
import { ReclamationsComponent } from './reclamations/reclamations.component';
import { ReclamationCreateComponent } from './reclamation-create/reclamation-create.component';
import { FavoritesComponent } from './favorites/favorites.component';

@NgModule({
  declarations: [
    MarketplaceComponent,
    ProductListComponent,
    ProductDetailsComponent,
    CartComponent,
    ReclamationsComponent,
    ReclamationCreateComponent,
    FavoritesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    MarketplaceRoutingModule
  ]
})
export class MarketplaceModule {}
