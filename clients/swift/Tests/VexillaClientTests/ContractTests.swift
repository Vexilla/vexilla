@testable import VexillaClient
import Foundation
import XCTest
import CoreFoundation

private enum HarnessError: Error { case failure(String) }
private enum TestData { case wire(Wire), manifest(Manifest), group(Group) }

@available(macOS 10.15.0, *)
final class ContractTests: XCTestCase {
    private func path() throws -> URL {
        guard let path = ProcessInfo.processInfo.environment["VEXILLA_CONTRACT_DIR"] else {
            throw XCTSkip("Use contract/scripts/run.cjs to supply immutable shared artifacts")
        }
        return URL(fileURLWithPath: path)
    }
    private func read(_ file: String) throws -> Wire { try Wire.decode(Data(contentsOf: path().appendingPathComponent(file))) }
    private func equal(_ a: Wire, _ b: Wire) -> Bool {
        switch (a,b) {
        case (.null,.null): return true
        case let (.string(a),.string(b)): return exact(a,b)
        case let (.number(a),.number(b)): return a == b
        case let (.bool(a),.bool(b)): return a == b
        case let (.array(a),.array(b)): return a.count == b.count && zip(a,b).allSatisfy(equal)
        case let (.object(a),.object(b)):
            return a.count == b.count && a.allSatisfy { item in b[item.key].map { equal(item.value,$0) } ?? false }
        default: return false
        }
    }
    private func outcome(_ fn: () async throws -> Wire) async throws -> Wire {
        do { return .object(["value":try await fn()]) }
        catch let error as VexillaError { return .object(["error":.string(error.kind)]) }
        catch is DecodingError { return .object(["error":.string("validation")]) }
    }
    private func instance(_ value: Wire) -> InstanceId {
        switch value { case let .string(v): return .string(v); case let .number(v): return .number(v); case .null: return .missing; default: return .invalid }
    }
    private func native(_ value: Wire) throws -> Any {
        switch value {
        case let .string(v): return v
        case let .number(v): return v
        case let .bool(v): return v
        case .null: return NSNull()
        default: throw HarnessError.failure("Unsupported fallback")
        }
    }
    private func wire(_ value: Any) throws -> Wire {
        try Wire.decode(JSONSerialization.data(withJSONObject:value,options:[.fragmentsAllowed]))
    }
    private func mutate(_ value: inout Wire, _ mutations: Wire) throws {
        func keys(_ pointer: String) -> [String] {
            pointer.split(separator:"/",omittingEmptySubsequences:false).dropFirst().map { $0.replacingOccurrences(of:"~1",with:"/").replacingOccurrences(of:"~0",with:"~") }
        }
        func at(_ value: Wire, _ keys: [String]) throws -> Wire {
            guard let first=keys.first else { return value }
            switch value {
            case let .object(fields):
                guard let item=fields[first] else { throw HarnessError.failure("Missing mutation source") }
                return try at(item,Array(keys.dropFirst()))
            case let .array(values): return try at(values[Int(first)!],Array(keys.dropFirst()))
            default: throw HarnessError.failure("Invalid mutation source")
            }
        }
        func set(_ value: inout Wire, _ keys: [String], _ item: Wire, _ remove: Bool) throws {
            let key=keys[0]
            switch value {
            case var .object(fields):
                if keys.count == 1 { fields[key] = remove ? nil : item }
                else {
                    guard var child=fields[key] else { throw HarnessError.failure("Missing mutation parent") }
                    try set(&child,Array(keys.dropFirst()),item,remove); fields[key]=child
                }
                value = .object(fields)
            case var .array(array):
                let index=Int(key)!
                if keys.count == 1 {
                    if remove { array.remove(at:index) }
                    else if index == array.count { array.append(item) }
                    else { array[index]=item }
                } else { try set(&array[index],Array(keys.dropFirst()),item,remove) }
                value = .array(array)
            default: throw HarnessError.failure("Invalid mutation parent")
            }
        }
        for mutation in try mutations.array() {
            let op=try mutation["op"].text();var item=mutation["value"]
            if op=="copy" { item=try at(value,keys(mutation["from"].text())) }
            else if case let .string(raw)=mutation["wireString"] { item=try Wire.decode(Data(raw.utf8)) }
            else if case let .string(name)=mutation["nativeNumber"] {
                switch name { case "NaN":item = .number(.nan);case "Infinity":item = .number(.infinity);case "-Infinity":item = .number(-.infinity);default:throw HarnessError.failure("Unknown native number") }
            }
            try set(&value,keys(mutation["path"].text()),item,op=="remove")
        }
    }
    func testSharedContract() async throws {
        let parity=try read("parity.json");let expected=try read("expected.json")
        func fetch(_ url: URL) async throws -> Data { try Data(contentsOf:path().appendingPathComponent(url.lastPathComponent)) }
        func client(_ env: String="prod",_ id: InstanceId = .string("member")) -> VexillaClient {
            VexillaClient(environment:env,baseUrl:"https://contract",instanceId:id)
        }
        func installed(_ env: String="prod") async throws -> VexillaClient {
            var c=client(env);try await c.syncManifest(fetch:fetch);try await c.syncFlags(groupNameOrId:"contract-group",fetch:fetch);return c
        }
        func data(_ value: TestData) throws -> Data {
            switch value {case let .wire(v):return try v.encoded();case let .manifest(v):return try v.wire.encoded();case let .group(v):return try v.wire.encoded()}
        }
        var observations:[Wire]=[]
        func observe(_ id: String,_ actual: Wire,_ want: Wire) throws {
            guard equal(actual,want) else {
                throw HarnessError.failure("\(id): \(String(decoding:try actual.encoded(),as:UTF8.self)) != \(String(decoding:try want.encoded(),as:UTF8.self))")
            }
            observations.append(.object(["caseId":.string(id),"outcome":actual]))
        }
        for section in ["hashes","numbers","gradual","schedules","validation","operations","aliases","timezones"] {
            for s in try parity[section].array() {
                let id=try s["id"].text();let actual:Wire
                switch section {
                case "hashes": actual=try await outcome { .number(Double(hashFnv32a(try s["text"].text()))) }
                case "numbers":
                    actual=try await outcome {
                        let text=try instanceText(instance(s["instance"]))
                        return .object(["text":.string(text),"hash":.number(Double(hashFnv32a(text)))])
                    }
                case "gradual":
                    actual=try await outcome {
                        var c=client();try await c.syncManifest(fetch:fetch);var g=try read("contract-group.json")
                        try mutate(&g,.array([
                            .object(["op":.string("set"),"path":.string("/environments/prod/features/gradual/seed"),"value":s["seed"]]),
                            .object(["op":.string("set"),"path":.string("/environments/prod/features/gradual/value"),"value":s["threshold"]])
                        ]))
                        try c.setFlags(group:Group.decode(data:g.encoded()))
                        return .object(["bucket":.number(try hashString(stringToHash:instanceText(instance(s["instance"])),seed:s["seed"].number())),
                            "enabled":.bool(try c.shouldCustom(groupNameOrId:"contract-group",featureNameOrId:"gradual",instanceId:instance(s["instance"])))])
                    }
                case "schedules":
                    actual=try await outcome {
                        try Validation.schedule(s["schedule"])
                        let schedule=try Schedule.decode(data:s["schedule"].encoded())
                        let type=ScheduleType(rawValue:try s["scheduleType"].text())!
                        return .bool(isScheduleActiveMillis(schedule:schedule,scheduleType:type,now:Int64(try s["now"].number(true))))
                    }
                case "validation":
                    func validate(_ fetched: Bool) async throws -> Wire {
                        var publication:Wire = .object(["manifest":try read("manifest.json"),"groups":.object(["contract-group":try read("contract-group.json")])])
                        try mutate(&publication,s["mutations"]);var c=client()
                        let manifestBytes=try publication["manifest"].encoded()
                        if fetched { try await c.syncManifest(fetch:{_ in manifestBytes}) }
                        else { try c.setManifest(manifest:Manifest.decode(data:manifestBytes)) }
                        for group in try publication["groups"].object() {
                            let groupBytes=try group.value.encoded()
                            if fetched { try await c.syncFlags(groupNameOrId:group.key,fetch:{_ in groupBytes}) }
                            else { try c.setFlags(group:Group.decode(data:groupBytes)) }
                        }
                        return .bool(true)
                    }
                    let direct=try await outcome {try await validate(false)}
                    let fetched=try await outcome {try await validate(true)}
                    guard equal(direct,fetched) else {throw HarnessError.failure("Ingestion paths disagree: "+id)}
                    actual=direct
                case "operations":
                    var clients:[String:VexillaClient]=[:];var values:[String:TestData]=[:];var results:[Wire]=[]
                    for step in try s["steps"].array() {
                        results.append(try await outcome {
                            let op=try step["op"].text()
                            if op=="load" {values[try step["as"].text()] = .wire(try read(step["file"].text()));return .null}
                            if op=="new" {clients[try step["client"].text()] = client(try step["environment"].text(),instance(step["instance"]));return .null}
                            if op=="mutate" {
                                let name=try step["data"].text()
                                guard case var .wire(value)=values[name]! else {throw HarnessError.failure("Expected mutable source data")}
                                try mutate(&value,step["mutations"]);values[name] = .wire(value);return .null
                            }
                            let name=try step["client"].text();var c=clients[name]!
                            defer {clients[name]=c}
                            func callback(_ url:URL) async throws -> Data {
                                if case .bool(true)=step["callback"]["throws"] {throw HarnessError.failure("Deliberate transport failure")}
                                if case let .string(file)=step["callback"]["file"] {return try read(file).encoded()}
                                return try data(values[step["callback"]["data"].text()]!)
                            }
                            switch op {
                            case "setManifest":
                                let value=values[try step["data"].text()]!
                                if case let .manifest(m)=value {try c.setManifest(manifest:m)} else {try c.setManifest(manifest:Manifest.decode(data:data(value)))}
                            case "setFlags":
                                let value=values[try step["data"].text()]!
                                if case let .group(g)=value {try c.setFlags(group:g)} else {try c.setFlags(group:Group.decode(data:data(value)))}
                            case "getManifest":values[try step["as"].text()] = .manifest(try await c.getManifest(fetch:callback))
                            case "getFlags":values[try step["as"].text()] = .group(try await c.getFlags(groupNameOrId:step["group"].text(),fetch:callback))
                            case "syncManifest":try await c.syncManifest(fetch:callback)
                            case "syncFlags":try await c.syncFlags(groupNameOrId:step["group"].text(),fetch:callback)
                            case "should":
                                if case .null=step["instance"] {return .bool(try c.should(groupNameOrId:step["group"].text(),featureNameOrId:step["feature"].text()))}
                                return .bool(try c.shouldCustom(groupNameOrId:step["group"].text(),featureNameOrId:step["feature"].text(),instanceId:instance(step["instance"])))
                            case "value":return try wire(c.value(groupNameOrId:step["group"].text(),featureNameOrId:step["feature"].text(),defaultValue:native(step["default"])))
                            default:throw HarnessError.failure("Unknown operation: "+op)
                            }
                            return .null
                        })
                    }
                    actual = .object(["value":.array(results)])
                case "aliases":actual=try await outcome {.string(try Compatibility.normalize(s["name"].text()))}
                default:
                    var c=client();try await c.syncManifest(fetch:fetch);var g=try read("contract-group.json")
                    try mutate(&g,.array([.object(["op":.string("set"),"path":.string("/features/toggle/schedule/timezone"),"value":s["timezone"]])]))
                    let result=try await outcome {try c.setFlags(group:Group.decode(data:g.encoded()));return .bool(true)}
                    if case let .string(kind)=result["error"] {XCTAssertEqual(kind,"validation")}
                    if case .string=result["error"] {actual = .object(["value":.bool(false)])} else {actual = .object(["value":.bool(true)])}
                }
                try observe(id,actual,s["expected"])
            }
        }
        for env in try expected["environments"].array() {
            for mode in ["id","name","alias"] {
                func key(_ id: String,_ name:String) throws ->String {mode=="id" ? id : mode=="name" ? name : try Compatibility.normalize(name)}
                let c=try await installed(key(env["id"].text(),env["name"].text()))
                let group=try key(expected["groupId"].text(),expected["groupName"].text())
                let prefix="publication/\(try env["id"].text())/\(mode)/"
                for (index,s) in try expected["cases"].array().enumerated() {
                    let feature=try key(s["id"].text(),s["name"].text())
                    let result=try await outcome {
                        if try s["kind"].text()=="value" {return try wire(c.value(groupNameOrId:group,featureNameOrId:feature,defaultValue:"fallback"))}
                        return .bool(try c.shouldCustom(groupNameOrId:group,featureNameOrId:feature,instanceId:instance(s["instance"])))
                    }
                    try observe(prefix+String(index),result,.object(["value":env[s["expectedKey"].text()]]))
                }
                let decoded=try Group.decode(data:read("contract-group.json").encoded())
                for name in try expected["scheduled"].array().map({try $0.text()}) + ["scheduled-active"] {
                    let f=decoded.environments[try env["id"].text()]!.features[name]!
                    try observe(prefix+"schedule/"+name,.object(["value":.bool(isScheduleActiveMillis(schedule:f.schedule,scheduleType:f.scheduleType,now:Int64(try expected["referenceClock"].number(true))))]),.object(["value":.bool(name=="scheduled-active")]))
                }
            }
        }
        let ids=try observations.map {try $0["caseId"].text()}
        XCTAssertEqual(Set(ids).count,observations.count)
        if let file=ProcessInfo.processInfo.environment["VEXILLA_OBSERVATIONS_FILE"] {
            try Wire.object(["protocol":.number(1),"sdk":.string("swift"),"runs":.array([.object(["runtime":.string("native"),"observations":.array(observations)])])]).encoded().write(to:URL(fileURLWithPath:file))
        }
        print("Swift shared observations:",observations.count)
    }
    func testRawUnicodeAndNativeModelsCannotBypassValidation() async throws {
        var c=VexillaClient(environment:"prod",baseUrl:"https://contract",instanceId:"member")
        let manifest=try Manifest.decode(data:read("manifest.json").encoded())
        let group=try Group.decode(data:read("contract-group.json").encoded())
        try c.setManifest(manifest:manifest);try c.setFlags(group:group)
        for escape in ["\\ud800","\\udfff","\\ud800x","\\udc00\\ud800"] {
            let bytes=Data("{\"version\":\"v1\",\"groups\":[],\"extra\":\"\(escape)\"}".utf8)
            let result=try await outcome {_ = try await c.getManifest(fetch:{_ in bytes});return .null}
            XCTAssertTrue(equal(result,.object(["error":.string("validation")])))
        }
        for id:InstanceId in [.missing,.invalid,.number(.nan),.number(.infinity),.integer(9007199254740993),.integer(Int64.max)] {
            XCTAssertThrowsError(try c.shouldCustom(groupNameOrId:"contract-group",featureNameOrId:"gradual",instanceId:id))
        }
        var modified=try read("contract-group.json")
        try mutate(&modified,.array([.object(["op":.string("set"),"path":.string("/environments/prod/features/gradual/value"),"value":.string("NaN")])]))
        let raw=modified["environments"]["prod"]["features"]["gradual"]
        let decoder=JSONDecoder();decoder.nonConformingFloatDecodingStrategy = .convertFromString(positiveInfinity:"Infinity",negativeInfinity:"-Infinity",nan:"NaN")
        let invalid=try decoder.decode(Feature.self,from:raw.encoded())
        var features=group.environments["prod"]!.features;features["gradual"]=invalid
        var environments=group.environments
        environments["prod"]=Environment(name:group.environments["prod"]!.name,environmentId:"prod",features:features)
        let bad=Group(name:group.name,groupId:group.groupId,meta:group.meta,environments:environments,features:group.features)
        XCTAssertThrowsError(try c.setFlags(group:bad))
        XCTAssertTrue(try c.should(groupNameOrId:"contract-group",featureNameOrId:"toggle"))
    }
}
