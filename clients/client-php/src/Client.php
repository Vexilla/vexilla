<?php

namespace Vexilla;

class Client
{

    private const FEATURE_TYPE_TOGGLE = 'toggle';
    private const FEATURE_TYPE_GRADUAL = 'gradual';
    private const FEATURE_TYPE_SELECTIVE = 'selective';

    /**
       * The base URL where your json file will be located.
       *
       * @var string
       */
    private $baseUrl;

    /**
       * The environment in which you are using this client.
       *
       * @var string
       */
    private $environment;

    /**
       * The UUID or other string value to be hashed into a number suitable for gradual rollout. (0 - 100)
       *
       * @var string
       */
    private $customInstanceHash;

    /**
       * A boolean that decides whether to use ord() or mb_ord in the hasher
       *
       * @var string
       */
      private $mbAware;

    /**
        * @param string $baseUrl
        * @param string $environment
        * @param string $customInstanceHash
     */
    function __construct($baseUrl, $environment, $customInstanceHash, $mbAware = true)
    {
        $this->baseUrl = $baseUrl;
        $this->environment = $environment;
        $this->customInstanceHash = $customInstanceHash;
        $this->mbAware = $mbAware;

        if($mbAware && !function_exists("mb_ord")) {
            throw new \ErrorException('You must set $mbAware to false and only use ASCII values inside of $customInstanceHash');
        } elseif(!$mbAware) {
            echo 'Warning: when $mbAware is false, you must use ASCII values in your $customInstanceHash';
        }
    }

    /**
        * @param string $fileName
     */
    function getFlags($fileName = '') {
        // fetch json
        $response = file_get_contents(
            sprintf(
                '%s/%s.json',
                $this->baseUrl,
                $fileName
            )
        );

        // parse the json
        $decodedJson = json_decode($response);

        // set flags
        $this->flags = $decodedJson->environments->{$this->environment};

        return $this;
    }

    /**
        * @param string $featureName
     */
    function should($featureName) {

        $feature = $this->flags->untagged->{$featureName};

        if ($feature->type === $this::FEATURE_TYPE_TOGGLE) {
            return $feature->value;
        } else if($feature->type === $this::FEATURE_TYPE_GRADUAL) {
            return $this->getInstancePercentile($feature->seed) <= $feature->value;
        } else {
            return false;
        }
    }

    /**
        * @param float $seed
     */
    private function getInstancePercentile($seed) {
        $hasher = new Hasher($seed, $this->mbAware);
        return $hasher->hashString($this->customInstanceHash);
    }

}
