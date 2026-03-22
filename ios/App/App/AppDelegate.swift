import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // #f8f9f5 — matches --color-surface-1
    private let surface = UIColor(red: 248.0/255.0, green: 249.0/255.0, blue: 245.0/255.0, alpha: 1.0)

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Tint every layer behind the WebView so the home-indicator zone matches the app
        guard let w = window else { return }
        w.backgroundColor = surface
        if let root = w.rootViewController {
            root.view.backgroundColor = surface
            // WKWebView is the first subview of the bridge VC's view
            for sub in root.view.subviews {
                if String(describing: type(of: sub)).contains("WKWebView") {
                    sub.backgroundColor = surface
                    if let scroll = sub.subviews.first(where: { $0 is UIScrollView }) as? UIScrollView {
                        scroll.backgroundColor = surface
                    }
                }
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
