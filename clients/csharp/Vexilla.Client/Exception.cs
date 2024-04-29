using System;

namespace Vexilla.Client
{
  public class InvalidShouldFeatureTypeException : Exception
  {
    public InvalidShouldFeatureTypeException(string message) : base(message) { }
  }
  public class InvalidShouldFeatureValueTypeException : Exception
  {
    public InvalidShouldFeatureValueTypeException(string message) : base(message) { }
  }
  public class InvalidValueFeatureTypeException : Exception
  {
    public InvalidValueFeatureTypeException(string message) : base(message) { }
  }
  public class InvalidValueFeatureValueTypeException : Exception
  {
    public InvalidValueFeatureValueTypeException(string message) : base(message) { }
  }
  public class GroupLookupKeyNotFoundException : Exception
  {
    public GroupLookupKeyNotFoundException(string message) : base(message) { }
  }
  public class FeatureLookupKeyNotFoundException : Exception
  {
    public FeatureLookupKeyNotFoundException(string message) : base(message) { }
  }
  public class EnvironmentLookupKeyNotFoundException : Exception
  {
    public EnvironmentLookupKeyNotFoundException(string message) : base(message) { }
  }
  public class EnvironmentFeatureKeyNotFoundException : Exception
  {
    public EnvironmentFeatureKeyNotFoundException(string message) : base(message) { }
  }
  public class UnknownException : Exception { }
}
