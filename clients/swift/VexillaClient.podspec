Pod::Spec.new do |spec|
  spec.name = "VexillaClient"
  spec.version = "1.0.1"
  spec.summary = "Vexilla client for cocoa"
  spec.homepage = "https://github.com/vexilla/vexilla"
  spec.license = "BUSL-1.1"
  spec.authors = "Vexilla"
  spec.source = { :git => "https://github.com/vexilla/vexilla.git", :tag => spec.version.to_s }

  spec.ios.deployment_target = "12.0"
  spec.osx.deployment_target = "10.13"
  spec.swift_version = "5.0"
  spec.module_name  = "VexillaClient"
  spec.requires_arc = true
  spec.frameworks = 'Foundation'
  spec.xcconfig = {
      'GCC_ENABLE_CPP_EXCEPTIONS' => 'YES'
}

  spec.default_subspecs = ['Core']

  spec.subspec 'Core' do |sp|
      sp.source_files = "Sources/Sentry/**/*.{h,m}",
        "Sources/SentryCrash/**/*.{h,m,mm,c,cpp}"

      sp.public_header_files =
        "Sources/Sentry/Public/*.h"

  end
end
