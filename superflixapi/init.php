<?php
/*
Plugin Name: SuperFlix API (Dooplay)
Description: Plugin para inclusão automática de players em seu site
Version: 1.0
Author: SuperFlix API
Author URI: superflixapi
*/
// function to create the DB / Options / Defaults					
function ss_options_install() { 
	// INITIAL
	$theme = get_template_directory();
	chmod(explode('themes',$theme)[0].'plugins/superflixapi', 0777);
	if(file_exists($theme.'/inc/doo_player.php')){// COPIA inc/doo_player.php
		$original = $theme.'/inc/doo_player.php';
		$backup = explode('themes',$theme)[0].'plugins/superflixapi/doo_player.php_superflixapi';
		copy($original, $backup);
	}


	$original = explode('themes',$theme)[0].'plugins/superflixapi/viewer.superflixapi';
	$myfile = fopen($original, "r") or die("Unable to open file!");
	$tr_links_movies = fread($myfile,filesize($original));
	fclose($myfile);


    $original = $theme.'/inc/doo_player.php';
	$myfile = fopen($original, "r") or die("Unable to open file!");
	$exists = fread($myfile,filesize($original));
	fclose($myfile);
    if(!@explode('viewer_original',$exists)[1]){
        replace_in_file($theme.'/inc/doo_player.php', ' viewer(', $tr_links_movies.' public static function viewer_original(');
    }

}

// run the install scripts upon plugin activation
register_activation_hook(__FILE__, 'ss_options_install');

//menu items
add_action('admin_menu','superflix_api_menu');
function superflix_api_menu() {
	
	//this is the main item for the menu
	add_menu_page('SuperFlixAPI', //page title 
	'SuperFlixAPI', //menu title
	'manage_options', //capabilities
	'superflix_api', //menu slug
	'superflix_api', //function
	'/wp-content/plugins/superflixapi/icon.ico', //
	5);
}
define('ROOTDIR', plugin_dir_path(__FILE__));
require_once(ROOTDIR . 'panel.php');




function desactive_superflixapi( $plugin, $network_wide ){
    if($plugin == 'superflixapi/init.php'){
        $theme = get_template_directory();
        if(file_exists($theme.'/inc/doo_player.php')){// COPIA inc/doo_player.php
            $original = $theme.'/inc/doo_player.php';
            $backup = explode('themes',$theme)[0].'plugins/superflixapi/doo_player.php_superflixapi';
            copy($backup, $original);
        }
    }
}
add_action( 'deactivated_plugin', 'desactive_superflixapi', 10, 2 );


function replace_in_file($FilePath, $OldText, $NewText)
{
    $Result = array('status' => 'error', 'message' => '');
    if(file_exists($FilePath)===TRUE)
    {
        if(is_writeable($FilePath))
        {
            try
            {
                $FileContent = file_get_contents($FilePath);
                $FileContent = str_replace($OldText, $NewText, $FileContent);
                if(file_put_contents($FilePath, $FileContent) > 0)
                {
                    $Result["status"] = 'success';
                }
                else
                {
                   $Result["message"] = 'Error while writing file';
                }
            }
            catch(Exception $e)
            {
                $Result["message"] = 'Error : '.$e;
            }
        }
        else
        {
            $Result["message"] = 'File '.$FilePath.' is not writable !';
        }
    }
    else
    {
        $Result["message"] = 'File '.$FilePath.' does not exist !';
    }
    return $Result;
}