import Foundation

typealias VexillaFlags = Dictionary<String, Dictionary<String, Dictionary<String, Dictionary<String, Any>>>>

let VEXILLA_FEATURE_TYPE_TOGGLE = "toggle"
let VEXILLA_FEATURE_TYPE_GRADUAL = "gradual"

enum VexillaFeatureType: String {
    case gradual = "gradual"
    case toggle = "toggle"
}

struct VexillaClient {
    let environment: String
    let baseUrl: String
    let customInstanceHash: String
    var flags: VexillaFlags?

    init(environment: String, baseUrl: String, customInstanceHash: String) {
        self.environment = environment
        self .baseUrl = baseUrl
        self.customInstanceHash = customInstanceHash
    }

    public func fetchFlags(fileName: String, fetchCompletionHandler: @escaping (VexillaFlags?, Error?) -> Void) {

        var flags: VexillaFlags?
        let url = URL(string: "\(self.baseUrl)/\(fileName)")

        guard let unwrappedUrl = url else {
            fetchCompletionHandler(nil, nil)
            return
        }

        var urlRequest = URLRequest(url: unwrappedUrl)
        urlRequest.httpMethod = "GET"
        let task = URLSession.shared.dataTask(with: urlRequest) { (data, response, error) in
            guard let data = data else {
                fetchCompletionHandler(nil, error)
                return
            }

            let parsedResponse: Dictionary = try! JSONSerialization.jsonObject(with: data) as! Dictionary<String, VexillaFlags>
            flags = parsedResponse["environments"]
            fetchCompletionHandler(flags, nil)
        }
        task.resume()

    }

    public mutating func setFlags(flags: VexillaFlags) {
        self.flags = flags
    }

    public func should(featureName: String) -> Bool {

        guard self.flags != nil else {
            return false
        }

        let feature = self.flags?[self.environment]?["untagged"]?[featureName]

        switch feature?["type"] as! String {
            case VEXILLA_FEATURE_TYPE_TOGGLE:
                return feature?["value"] as! Bool
            case VEXILLA_FEATURE_TYPE_GRADUAL:
                let threshold = feature?["value"] as! Int
                let seed = feature?["seed"] as! Float64
                return self.hashInstanceId(seed: seed) <= threshold
            default:
                return false
        }
    }

    internal func hashInstanceId(seed: Float64) -> Int {
        let chars = Array(self.customInstanceHash)

        let total = chars.reduce(0, { a, b in
            a + Int(b.asciiValue ?? 0)
        })

        var calculated = Float64(total) * seed * 42.0
        calculated.round(.down)
        let modded = calculated.truncatingRemainder(dividingBy: 100.0)

        return Int(modded)
    }

}
