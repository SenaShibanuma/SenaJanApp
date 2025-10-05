import os
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Get the absolute path to the index.html file
    file_path = os.path.abspath('index.html')

    # Navigate to the local HTML file
    page.goto(f'file://{file_path}')

    # --- Configure the hand to create a Fu difference ---
    # A simple change of the wait type is enough to cause a Fu difference
    # and is a more reliable event to trigger.
    page.select_option('#wait-type', 'kanchan')

    # --- Verify the result ---
    # Expected: 1飜 (ロン40符 / ツモ30符)
    # Ron: Base(20) + Menzen Ron(10) + Kanchan Wait(2) = 32 -> 40 Fu
    # Tsumo: Base(20) + Tsumo(2) + Kanchan Wait(2) = 24 -> 30 Fu
    result_han_fu = page.locator('#result-han-fu')
    expect(result_han_fu).to_have_text('1飜 (ロン40符 / ツモ30符)')

    # Check the highlighted cells in the table
    ron_cell = page.locator('#cell-1-40')
    tsumo_cell = page.locator('#cell-1-30')

    # Assert that the correct cells have the highlight classes.
    expect(ron_cell).to_have_class('highlight-ron')
    expect(tsumo_cell).to_have_class('highlight-tsumo')

    # Take a screenshot for visual confirmation
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)

print("Playwright script executed successfully and screenshot taken.")