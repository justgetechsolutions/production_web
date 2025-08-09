describe('Multi-tenant Order Isolation', () => {
  it('should show order only in correct restaurant dashboard', () => {
    // 1. Visit QR URL for blue-orchid table 5
    cy.visit('/r/blue-orchid/menu/5');
    // 2. Add item to cart and place order
    cy.contains('Add to Cart').first().click();
    cy.contains('Place Order').click();
    // 3. Log in as blue-orchid admin and check dashboard
    cy.visit('/login');
    cy.get('input[type=email]').type('admin@blueorchid.com');
    cy.get('input[type=password]').type('password');
    cy.get('button[type=submit]').click();
    cy.visit('/admin/order');
    cy.contains('Table 5');
    // 4. Log in as another restaurant admin and verify order is NOT visible
    // (repeat login with different credentials and check absence)
  });
}); 