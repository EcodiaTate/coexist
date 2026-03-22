import UIKit
import Capacitor

class CoExistViewController: CAPBridgeViewController {

    // #f8f9f5 — must match --color-surface-1
    private let surface = UIColor(red: 248/255, green: 249/255, blue: 245/255, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        // Root view behind everything
        view.backgroundColor = surface

        // WKWebView itself
        webView?.backgroundColor = surface
        webView?.isOpaque = false
        // The scroll view inside the WKWebView
        webView?.scrollView.backgroundColor = surface
    }
}
